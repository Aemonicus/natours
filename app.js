const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet')
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require("hpp")
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser")
const compression = require("compression")

const AppError = require('./utils/appError')
const globalErrorHandler = require("./controllers/errorController")
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

app.enable("trust proxy")

app.set("view engine", "pug")
app.set("views", path.join(__dirname, "views"))

app.use(express.static(path.join(__dirname, 'public')));


// 1) MIDDLEWARES

// Middleware contre les blocages cors
app.use(cors({ credentials: true, origin: true }));

// options est un type de requête comme get/post/patch... rien à voir avec des détails/précisions/éléments d'objet
// Ex app.options("/api/v1/tours/:id", cors())
app.options("*", cors())


// Middleware pour protéger les headers des requêtes http
// app.use(helmet())

app.use(
  //   helmet({
  //     contentSecurityPolicy: false
  //   })
  // )
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", 'https:', 'http:', 'data:', 'ws:'],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'http:', 'data:'],
      scriptSrc: [
        "'self'",
        'https:',
        'http:',
        'blob:'],
      styleSrc: ["'self'", 'https:', 'http:', "'unsafe-inline'"]
    }
  })
)


// Middleware pour afficher les logs en mode dévelopement
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Middleware pour limiter le nombre de requêtes de la même ip
const limiter = rateLimit({
  // Adapter le nombre de requêtes en fonction du projet
  max: 100,
  // Par heure
  windowMs: 60 * 60 * 1000,
  message: "Too many request from this IP, please try again later"
})
app.use("/api", limiter)


// Middleware "bodyparser", utilisé pour lire les données du body dans req.body
// ET permet d'utiliser .json({}) dans la response
// Ex : res.status(201).json({
//   status: "success",
//  data: {
//    user: newUser
//  }
// })
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser())


// Middleware contre les injonctions de requêtes nosql
app.use(mongoSanitize())


// Middleware contre les attaques XSS
app.use(xss())


// Middleware contre les pollutions de paramètres de requêtes, c'est à dire contre les doublons dans les requêtes
// Ex : si on veut trier par duration=5&duration=9, il ne prendra en compte que le dernier. Problème, si on veut vraiment trier sur le même paramètre, il faut rajouter dans une whitelist les paramètres qui peuvent être doublés sinon le tri ne fonctionnera pas bien. Bien remplir les paramètres.. ou oublier ce middleware lol
app.use(hpp({
  whitelist: ["duration", "maxGroupSize", "difficulty", "ratingsAverage", "ratingsQuantity", "price", "priceDiscount", "startDates"]
}))

// Middleware qui va compresser tous les textes que l'on envoie au client (json et compagnie) mais pas les images, histoire d'alléger la réponse
app.use(compression())

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 3) ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// Route pour gérer les erreurs (url non reconnue dans les routes au-dessus)
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404))
})

// Global Error Express Middleware
app.use(globalErrorHandler)
module.exports = app;


