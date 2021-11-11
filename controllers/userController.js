const multer = require('multer');
const sharp = require('sharp');
const User = require('./../models/userModel')
const catchAsync = require('./../utils/catchAsync')
const AppError = require('./../utils/appError')
const factory = require("./handlerFactory")

// // Version storage sans modifications de l'images
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "public/img/users")
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1]
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`)
//   }
// })

// Version avec modifications de l'image, on passe par memoryStorage qui n'enregistre pas directement dans le dossier mais garde plutôt en mémoire sous forme de buffer accessible dans req.file.buffer le temps de modifier justement le fichier/image
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

exports.uploadUserPhoto = upload.single("photo")

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next()

  // on va définir req.file.filename car on s'en sert plus bas. De base il était créé dans la version storage sans modification de l'image mais vu qu'on fait différemment, on doit le redéfinir
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`

  // l'image sera récupéré par sharp sur lequel on peut enchainer les fonctions de modificiations d'image
  // resize(width, height)

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`)

  next()
})

const filterObj = (obj, ...allowedFields) => {
  const newObj = {}
  // We loop through the object
  Object.keys(obj).forEach(item => {
    // We populate the newObj with the items found in allowedFields
    if (allowedFields.includes(item)) {
      newObj[item] = obj[item]
    }
  })
  return newObj
}

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false })

  res.status(204).json({
    status: 'success',
    data: null
  })
})

// Update currently authenticated user
exports.updateMe = catchAsync(async (req, res, next) => {

  if (req.body.password || req.body.passwordConfirmation) {
    return next(new AppError("This route is not for password updates. Please use /updateMyPassword", 400))
  }

  // We specify the fields we want to keep in the req.body so that the user doesn't change anything else in the database
  const filteredBody = filterObj(req.body, "name", "email")

  if (req.file) filteredBody.photo = req.file.filename

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  })

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  })
})

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined! Please use signup instead'
  });
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id
  next()
}

exports.getUser = factory.getOne(User)

exports.getAllUsers = factory.getAll(User)

// Do NOT update passwords with this method
exports.updateUser = factory.updateOne(User)

exports.deleteUser = factory.deleteOne(User)
