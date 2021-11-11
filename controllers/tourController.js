const multer = require('multer');
const sharp = require('sharp');
const Tour = require('./../models/tourModel');
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const factory = require("./handlerFactory")

const multerStorage = multer.memoryStorage()

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true)
  } else {
    cb(new AppError("Not an image! Please upload only images", 400), false)
  }
}

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
})

// Si upload une image => upload.single("image")
// Si upload multiple => upload.array("images", 5)
// Si mix des deux (une image de présentation et ensuite d'autres..) => upload.fields({})

exports.uploadTourImages = upload.fields([
  { name: "imageCover", maxCount: 1 },
  { name: "images", maxCount: 3 }
])

exports.resizeTourImages = catchAsync(async (req, res, next) => {

  if (!req.files.imageCover || !req.files.images) return next()

  // CoverImage
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`

  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`)

  // Images
  req.body.images = []
  // On doit utiliser map avec Promise.all car la boucle pour enregistrer chaque image dans le tableau req.body.images n'est pas async, c'est l'intérieur de la boucle qui est async. Ca veut dire que le process d'enregistrement global ne sera pas attendu, on passera directement au next dessous. Pour s'assurer que la boucle d'enregistrement se termine avant de passer au next, on pose map en duo avec Promise.all + await pour obliger le next suivant à attendre
  await Promise.all(req.files.images.map(async (file, index) => {
    const filename = `tour-${req.params.id}-${Date.now()}-${index + 1}.jpeg`

    await sharp(file.buffer)
      .resize(2000, 1333)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toFile(`public/img/tours/${filename}`)

    req.body.images.push(filename)
  }))

  next()
})

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = "5"
  req.query.sort = "-ratingsAverage.price"
  req.query.fields = "name.price.ratingsAverage.summary.difficulty"
  next()
}

exports.getAllTours = factory.getAll(Tour)

// on passe en objet le populateOption, review ici
exports.getTour = factory.getOne(Tour, { path: "reviews" })

exports.createTour = factory.createOne(Tour)

exports.updateTour = factory.updateOne(Tour)

exports.deleteTour = factory.deleteOne(Tour)


exports.getTourStats = catchAsync(async (req, res, next) => {
  // La fonction aggregate nous permet de traiter une requête en différentes étapes sur tous les Models(éléments) Tour. C'est à dire de faire du travail de statistiques comme moyenne, min, max etc.. sur plusieurs objets facilement
  const stats = await Tour.aggregate([
    // une étape d'exemple
    {
      // l'aggrégateur de l'étape, on veut matcher les ratingsAverage égaux ou supérieur à 4.5
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    // autre étape importante : elle définit comment on regroupe les résultats de l'aggregate avec $group
    // Avec _id: null, on va réaliser nos étapes sur tous les éléments globalement
    // Avec _id: "difficulty", on va réaliser nos étapes en triant tous les éléments par difficultés
    {
      $group: {
        _id: "$difficulty",
        numTours: { $sum: 1 },
        numRatings: { $sum: "$ratingsQuantity" },
        avgRating: { $avg: "$ratingsAverage" },
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" }
      }
    },
    // On va sort, on doit utiliser les clés de propriétés utilisées dans $group au-dessus
    // avgPrice:1 veut dire du - au + cher
    {
      $sort: { avgPrice: 1 }
    },
    // On peut répéter les étapes
    // Ici on exclut les Tours "easy"
    // {
    //   $match: {
    //     _id: { $ne: "easy" }
    //   }
    // }
  ])

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
})

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1 // 2021
  const plan = await Tour.aggregate([
    // On va organiser par date, c'est à dire qu'on va dupliquer les Tours qui se répètent sur plusieurs dates
    {
      $unwind: "$startDates"
    },
    // On veut uniquement ceux entre telle date et telle date
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    // On va les grouper par date (mois) pour savoir combien de Tours on aura par mois ($sum) avec un array de noms ($push)
    {
      $group: {
        _id: { $month: "$startDates" },
        numTourStarts: { $sum: 1 },
        tours: { $push: "$name" }
      }
    },
    // On ajoute un champs 
    {
      $addFields: { month: "$_id" }
    },
    // On décide les champs affichés (1) ou ignorés (0)
    {
      $project: {
        _id: 0
      }
    },
    {
      $sort: { month: 1 }
      // $sort: { numTourStarts: -1 }
    },
    {
      $limit: 12
    }
  ])

  res.status(200).json({
    status: 'success',
    data: {
      plan
    }
  });
})

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params
  const [lat, lng] = latlng.split(",")

  const radius = unit === "mi" ? distance / 3963.2 : distance / 6378.1

  if (!lat || !lng) {
    next(new AppError("Please provide latitude and longitude in the format lat, lng.", 400))
  }

  const tours = await Tour.find({
    startLocation: {
      $geoWithin: {
        $centerSphere: [[lng, lat], radius]
      }
    }
  })
  res.status(200).json({
    status: "success",
    results: tours.length,
    data: {
      tours
    }
  })
})

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params
  const [lat, lng] = latlng.split(",")

  const multiplier = unit === "mi" ? 0.000621371 : 0.001

  if (!lat || !lng) {
    next(new AppError("Please provide latitude and longitude in the format lat, lng.", 400))
  }

  // Quand on fait des calculs, on passe toujours par aggregate et avec geoLocation on utilise $geoNear en premier, seule méthode fournie pour du calcul géospatial. Ensuite on va utiliser l'index "startLocation" vu que dans le tourModel on l'a déjà définie "2dsphere"
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        // le lieu entré dans near sera comparé à startLocation ici car on l'a défini dans l'index du tourModel avec "2dsphere"
        near: {
          type: "Point",
          coordinates: [lng * 1, lat * 1]
        },
        // le lieu vers lequel on tend (par exemple "distance": 64 veut dire que ce lieu est à 64 km de l'endroit que l'on a rentré. Paris -> Montpellier on aura Paris comme lieu de départ et "distance": 700 vu que Montpellier est à 700 km de distance de PAris)
        distanceField: "distance",
        distanceMultiplier: multiplier
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ])

  res.status(200).json({
    status: "success",
    data: {
      distances
    }
  })
})