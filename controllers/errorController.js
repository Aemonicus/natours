const AppError = require("./../utils/appError")

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}`
  return new AppError(message, 400)
}

const handleDuplicateFieldsDB = err => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0]
  const message = `Duplicate field value: ${value}. Please use another value`
  return new AppError(message, 400)
}

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(item => item.message)
  const message = `Invalid input data. ${errors.join(". ")}`
  return new AppError(message, 400)
}

const sendErrorDev = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith("/api")) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    })
  }
  // RENDERED WEBSITE
  console.error("ERROR", err)
  return res.status(err.statusCode).render("error", {
    title: "Something went wrong",
    msg: err.message
  })
}

const handleJWTError = () => new AppError("Invalid Token, please log in again!", 401)

const handleJWTExpiredError = () => new AppError("Expired Token, please log in again!", 401)


const sendErrorProd = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith("/api")) {
    // Operational, trusted error : send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      })
      // Programming or other unknown error : no details to the client
    }
    // 1) Log error
    console.error("ERROR", err)

    // 2) Send generic message
    return res.status(500).json({
      status: "error",
      message: "Something went wrong"
    })

  }
  // RENDERED WEBSITE
  if (err.isOperational) {
    return res.status(err.statusCode).render("error", {
      title: "Something went wrong",
      msg: err.message
    })

    // Programming or other unknown error : no details to the client
  }
  // 1) Log error
  console.error("ERROR", err)

  // 2) Send generic message
  return res.status(err.statusCode).render("error", {
    title: "Something went wrong",
    msg: "Please try again later"
  })
}

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500
  err.status = err.status || "error"

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res)
  } else if (process.env.NODE_ENV === "production") {
    let error = { ...err }
    error.message = err.message
    // Gestion en cas de "CastError" qui engendre un message d'erreur pas forcément très clair de la part de mongoose
    if (error.name === "CastError") error = handleCastErrorDB(error)

    // Gestion en cas d'erreur de doublons dans la bdd
    if (error.code === 11000) error = handleDuplicateFieldsDB(error)

    // Gestion en cas d'erreur de validation
    if (error.name === "ValidationError") error = handleValidationErrorDB(error)

    // Gestion en cas d'erreur JWT: Mauvais Token
    if (error.name === "JsonWebTokenError") error = handleJWTError()

    // Gestion en cas d'erreur JWT: Token expiré
    if (error.name === "TokenExpiredError") error = handleJWTExpiredError()

    sendErrorProd(error, req, res)
  }
}