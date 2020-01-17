'use strict';
module.exports = function (app) {
  var accountController = require('../controllers/account');

  //Routes Account & Auth
  app.route('/account/change_password/:user_id').put(accountController.updatePassword)
  app.route('/signin').post(accountController.signIn)
  app.route('/signin_social').post(accountController.signInSocial)
  app.route('/auth/:token').get(accountController.checkAuth)
  app.route('/user/:token').get(accountController.getUserLogin)
  app.route('/signup').post(accountController.signUp)
  app.route('/signup_social').post(accountController.signUpSocial)
  app.route('/connect_social').post(accountController.connectSocial)

  var notificationController = require('../controllers/notification');

  app.route('/notification/push_notification').post(notificationController.pushNotification)
};