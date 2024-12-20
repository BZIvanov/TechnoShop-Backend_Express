const express = require('express');

const {
  register,
  login,
  logout,
  currentUser,
  updatePassword,
  forgotPassword,
  resetPassword,
  updateAvatar,
} = require('./user.controllers');
const authenticate = require('../../middlewares/authenticate');
const fileUpload = require('../../middlewares/file-upload');
const validateRequestBody = require('../../middlewares/validate-request-body');
const {
  registerValidationSchema,
  loginValidationSchema,
  forgotPasswordValidationSchema,
  resetPasswordValidationSchema,
  updatePasswordValidationSchema,
} = require('./user.validationSchema');

const router = express.Router();

router
  .route('/register')
  .post(validateRequestBody(registerValidationSchema), register);
router.route('/login').post(validateRequestBody(loginValidationSchema), login);
router.route('/logout').post(authenticate, logout);
router.route('/current-user').get(currentUser);
router
  .route('/update-password')
  .patch(
    validateRequestBody(updatePasswordValidationSchema),
    authenticate,
    updatePassword,
  );
router
  .route('/forgot-password')
  .post(validateRequestBody(forgotPasswordValidationSchema), forgotPassword);
router
  .route('/reset-password')
  .post(validateRequestBody(resetPasswordValidationSchema), resetPassword);
router
  .route('/update-avatar')
  .patch(authenticate, fileUpload.single('avatarImage'), updateAvatar);

module.exports = router;
