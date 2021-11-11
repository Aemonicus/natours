const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');


const router = express.Router();

router.post("/signup", authController.signup)
router.post("/login", authController.login)
router.get("/logout", authController.logout)
router.post("/forgotPassword", authController.forgotPassword)
router.patch("/resetPassword/:token", authController.resetPassword)

// Va protéger toutes les routes après cette route, donc à partir de la ligne 13
router.use(authController.protect)

router.get("/me", userController.getMe, userController.getUser)
router.patch("/updateMyPassword", authController.updatePassword)
router.patch("/updateMe", userController.uploadUserPhoto, userController.resizeUserPhoto, userController.updateMe)
router.delete("/deleteMe", userController.deleteMe)

router
  // On ne pose que /  et /:id car dans le middleware présent dans app.js on précise déjà la route
  // Par exemple :
  // Equivalent à /api/v1/users/
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  // Equivalent à /api/v1/users/:id
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);


module.exports = router;
