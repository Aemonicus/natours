const express = require('express');
const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');

// mergeParams permet d'avoir accès aux paramètres d'autres routes. Ici par exemple on n'a aucun paramètre car la route utilise ("/"). Or pour créer un commentaire à un tour, on a besoin de la route "/:tourId/reviews" présente dans "tourRoutes.js" et dans cette route on a comme paramètre "tourId". mergeParams nous permet d'y avoir accès.
const router = express.Router({ mergeParams: true });

// Va protéger toutes les routes après cette route, donc à partir de la ligne 9
router.use(authController.protect)

router
  .route("/")
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo("user"),
    reviewController.setTourUserIds,
    reviewController.createReview)

router
  .route("/:id")
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo("user", "admin"),
    reviewController.updateReview)
  .delete(
    authController.restrictTo("user", "admin"),
    reviewController.deleteReview)

module.exports = router;