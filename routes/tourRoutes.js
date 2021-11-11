const express = require('express');
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');
const reviewRouter = require("./../routes/reviewRoutes")

const router = express.Router();

// On renvoie au router de reviewRouter
router.use("/:tourId/reviews", reviewRouter)

router
  .route("/top-5-cheap")
  .get(tourController.aliasTopTours, tourController.getAllTours)

router
  .route("/tour-stats")
  .get(tourController.getTourStats)

router
  .route("/monthly-plan/:year")
  .get(authController.protect, authController.restrictTo("admin", "lead-guide", "guide"), tourController.getMonthlyPlan)

router
  .route("/tours-within/:distance/center/:latlng/unit/:unit")
  .get(tourController.getToursWithin)

router
  .route("/distances/:latlng/unit/:unit")
  .get(tourController.getDistances)

router
  // On ne pose que /  et /:id car dans le middleware présent dans app.js on précise déjà la route
  // Par exemple :
  // Equivalent à /api/v1/tours/
  .route('/')
  .get(tourController.getAllTours)
  .post(authController.protect, authController.restrictTo("admin", "lead-guide"), tourController.createTour);

router
  // Equivalent à /api/v1/tours/:id
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo("admin", "lead-guide"),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour)
  .delete(authController.protect, authController.restrictTo("admin", "lead-guide"), tourController.deleteTour);


module.exports = router;
