import { Router } from "express";
const router = Router();
import * as controller from '../controllers/appController.js';  
import * as codeController from '../controllers/userCodeController.js';
import multer from 'multer';
import {auth,localVariables} from '../middlewares/auth.js';
import { registerMail } from '../controllers/mailer.js'
const upload = multer({ storage: controller.storage });


//post request
router.route('/signup').post(upload.single('profile'),controller.register); // register user
router.route('/signupMail').post(registerMail); // send the email  
router.route('/authenticate').post(controller.verifyUser, (req, res) => res.end()); // authenticate user
router.route('/login').post(controller.verifyUser, controller.login); // login in app

//get request
router.route('/getAllUsers').get(controller.getAllUser); // get user
router.route('/getAllDeletedUsers').get(controller.getAllDeletedUser); // get user
router.route('/getUsersCount').get(controller.getUsersCount); // get user count
router.route('/getDeletedUsersCount').get(controller.getDeleteUserCount); 
router.route('/getUserById/:id').get(controller.getUserById); // get user by id
router.route('/user/:emailOrUsername').get(controller.getUser) // user with username
router.route('/generateOTP').get(controller.verifyUser, localVariables, controller.generateOTP) // generate random OTP
router.route('/verifyOTP').get(controller.verifyUser, controller.verifyOTP) // verify generated OTP
router.route('/createResetSession').get(controller.createResetSession) // reset all the variables

//patch request
router.route('/deleteUser').patch(auth,controller.deleteUser); // delete user
router.route('/revertDeletedUser').patch(auth,controller.revertDeletedUser); // delete user
router.route('/updateUser').patch(auth,upload.single('profile'),controller.updateUser); // is use to update the user profile
router.route('/resetPassword').patch(controller.verifyUser, controller.resetPassword); // use to reset password


//code routes

//post request
router.route('/createCode').post(auth,codeController.createCode); // create code

//get request
router.route('/getAllCodes').get(auth,codeController.getAllCodes); // get all codes
router.route('/getOnlyDeletedCodesByUsername').get(codeController.getOnlyDeletedCodesByUsername); // get only deleted codes
router.route('/getCodeById').get(auth,codeController.getCodeById); // get code by id
router.route('/getCodesByUserId').get(auth,codeController.getCodesByUserId); // get code by user id
router.route('/getAllCodesByUsername').get(codeController.getAllCodesByUsername); // get code by username

//patch request
router.route('/updateCode').patch(auth,codeController.updateCode); // update code by id
router.route('/revertDeletedCode').patch(auth,codeController.revertDeletedCode); // revert deleted code

//delete request
router.route('/deleteCode').patch(auth,codeController.deleteCode); // delete code by id




export default router;