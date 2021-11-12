const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require("../utils/apiFeatures")


exports.deleteOne = Model => catchAsync(async (req, res, next) => {
  const doc = await Model.findByIdAndDelete(req.params.id, err => {
    if (!doc) {
      return next(new AppError(`No ${Model} found with that ID`, 404))
    }
  })
  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.updateOne = Model => catchAsync(async (req, res, next) => {
  const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  })
  if (!doc) {
    return next(new AppError("No document found with that ID", 404))
  }

  res.status(200).json({
    status: 'success',
    data: {
      doc
    }
  });
});

exports.createOne = Model => catchAsync(async (req, res, next) => {
  const document = await Model.create(req.body)

  res.status(201).json({
    status: "success",
    data: {
      data: document
    }
  })
});

exports.getOne = (Model, populateOptions) => catchAsync(async (req, res, next) => {
  // Exemple avec Tour
  // const tour = await Tour.findOne({ _id: req.params.id })
  // populate me permet de remplir les champs/documents du model liés à une autre collection. Ici il s'agit du champs/document "guides" de la collection "tours" qui "appelle" les infos de la collection "user". Tout se fait donc dans la requête et pas dans la bdd (on ne stocke que les id dans le champs/document "guides" de la collection "tour")
  let query = Model.findById(req.params.id)
  if (populateOptions) query = query.populate(populateOptions)
  const document = await query

  // En mettant return next je sors avant le res, j'enchaine directement au middleware suivant qui est celui des gestions des erreurs dans app.js (globalErrorHandler). Rappel, je suis ici dans une route qui est un middleware posé dans app.js. Si je ne pose pas le return, next ne suffit pas et la route va envoyer la response de cette route en plus de la response du prochain middleware car next veut dire "on passe au prochain middleware ET si il reste du code ici, je l'exécute après"
  if (!document) {
    return next(new AppError("No document found with that ID", 404))
  }


  res.status(200).json({
    status: 'success',
    data: {
      document,
      // nécessaire pour afficher les reviews qui ont été populate de manière virtual dans le model
      ...document.$$populatedVirtuals
    }
  })
});

exports.getAll = Model => catchAsync(async (req, res, next) => {
  // To allow for nested GET reviews on tour
  let filter = {}
  if (req.params.tourId) filter = { tour: req.params.tourId }

  const features = new APIFeatures(Model.find(filter), req.query).filter().sort().limitFields().paginate()
  const documents = await features.query

  res.status(200).json({
    status: 'success',
    results: documents.length,
    data: {
      documents
    }
  });
});