const crypto = require("crypto")
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel')
const catchAsync = require('./../utils/catchAsync')
const AppError = require('./../utils/appError')
const Email = require('./../utils/email')


const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  })
}

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id)

  // Création du cookie pour envoyer le token au client
  // Option : 
  // expires avec transformation en millisecond
  // secure pour dire que l'on envoie le cookie uniquement via https protocole, uniquement en production
  // httpOnly pour dire qu'il sera impossible de le modifier par le client
  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    // secure: true,
    httpOnly: true
  }

  if (process.env.NODE_ENV === "production") cookieOptions.secure = true

  res.cookie('jwt', token, cookieOptions)

  // Remove password from the output in the cookie
  user.password = null

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user: user
    }
  })
}

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirmation: req.body.passwordConfirmation,
    role: req.body.role,
  })

  const url = `${req.protocol}://${req.get("host")}/me`
  await new Email(newUser, url).sendWelcome()

  createSendToken(newUser, 201, res)
})

exports.login = catchAsync(async (req, res, next) => {
  // Destructuring
  // const email = req.body.email est équivalent à const {email} = req.body
  const { email, password } = req.body

  if (!email || !password) {
    return next(new AppError("Please provide a valid email and password", 400))
  }

  // Quand on veut récupérer une propriété du model que l'on ne fait pas remonter (avec select: false dans le model), on utilise select("+") avec le nom de la propriété qui nous intéresse
  const user = await User.findOne({ email }).select("+password")

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401))
  }

  createSendToken(user, 200, res)
})

exports.logout = (req, res) => {
  res.cookie("jwt", "logout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: true
  })
  res.status(200).json({ status: "success" })
}

exports.protect = catchAsync(async (req, res, next) => {
  let token
  // On vérifie qu'on a bien un token
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1]
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt
  }

  if (!token) {
    return next(new AppError("You are not logged in !", 401))
  }

  // promisify est un utility déjà inclus dans nodejs permettant de récupérer le résultat d'une promise (jwt.verify ici)
  // On vérifie le token 
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)

  const currentUser = await User.findById(decoded.id)
  if (!currentUser) {
    return next(new AppError("The user belonging to this token does no longer exist", 401))
  }

  // On vérifie si l'utilisateur a changé son mdp après lui avoir envoyé un token. Si c'est le cas, on lui demandera de se login encore pour envoyer un nouveau token
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError("User recently changed password! Please log in again", 401))
  }

  // Si on arrive ici, c'est que tout est ok donc avec next() on envoie sur la suite
  req.user = currentUser
  res.locals.user = currentUser

  next()
})

exports.isLoggedIn = async (req, res, next) => {

  if (req.cookies.jwt) {

    try {

      // promisify est un utility déjà inclus dans nodejs permettant de récupérer le résultat d'une promise (jwt.verify ici)
      // On vérifie le token 
      const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET)

      const currentUser = await User.findById(decoded.id)
      if (!currentUser) {
        return next()
      }

      // On vérifie si l'utilisateur a changé son mdp après lui avoir envoyé un token. Si c'est le cas, on lui demandera de se login encore pour envoyer un nouveau token
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next()
      }

      // Si on arrive ici, c'est que tout est ok donc avec next() on envoie sur la suite
      res.locals.user = currentUser
      return next()
    } catch (err) {
      return next()
    }
  }
  next()
}

// On ne peut pas avoir d'argument dans un middleware donc on doit englober le middleware à l'intérieur d'une fonction qui elle acceptera un ou plusieurs arguments
// (...roles) => rest operator pour créer un tableau ("roles" ici) à partir des arguments (roles ici)
// La fonction qui englobe
exports.restrictTo = (...roles) => {
  // La fonction renvoie la fonction middleware qui aura accès au tableau d'arguments de la fonction mère (rappel => avoir accès aux éléments d'une fonction mère = closure)
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to perform this action", 403))
    }
    next()
  }
}

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email })
  if (!user) {
    return next(new AppError("There is no user with this email", 404))
  }
  const resetToken = user.createPasswordResetToken()
  // validateBeforeSave: false nécessaire car comme on sauvegarde en bdd le user sans les champs que l'on a posé comme requis à la création, il va nous bugger à la figure
  await user.save({ validateBeforeSave: false })
  // On va poser un try catch et ne pas passer par le gestionnaire global des erreurs car on veut réaliser une action bien précise en plus de simplement dire qu'il y a une erreur
  try {
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
    console.log("user", user, "resetURL", resetURL)
    await new Email(user, resetURL).sendPasswordReset()
    console.log("sept")
    res.status(200).json({
      status: "success",
      message: "Token sent to email"
    })
  } catch (err) {
    user.passwordResetToken = null,
      user.passwordResetExpires = null

    await user.save({ validateBeforeSave: false })

    return next(err)
    // return next(new AppError("There was an error sending the email. Try again!", 500))
  }

})

exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex")

  // On cherche le user avec le token ET on vérifie que le password reset soit supérieur à la date du jour
  const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } })

  if (!user) {
    return next(new AppError("Token invalid or has expired", 400))
  }

  user.password = req.body.password
  user.passwordConfirmation = req.body.passwordConfirmation
  user.passwordResetToken = null
  user.passwordResetExpires = null

  // On va préferer utiliser save() pour que mongoose utilise automatiquement les validators du model et pour utiliser la méthode pre.save() du model
  await user.save()

  createSendToken(user, 200, res)
}
)

exports.updatePassword = catchAsync(async (req, res, next) => {
  // On doit rajouter le select pour ajouter le password aux propriétés car de base dans le model on a demandé de ne pas l'inclure
  const user = await User.findById(req.user.id).select("+password")

  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("Your current password is wrong", 401))
  }

  user.password = req.body.password
  user.passwordConfirmation = req.body.passwordConfirmation

  // On ne peut pas utiliser des méthodes de type findAndUpdate à cause du validator du model et parce que les méthodes userSchema.pre() ne sont pas valables. De manières générales, il faut éviter les findAndUpdate si on veut manipuler les password
  await user.save({ validateBeforeSave: false })

  createSendToken(user, 200, res)
})