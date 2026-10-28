import {Router} from 'express'
import * as authController from '../controllers/auth.controller.js'
//this file is used to set up / declare the routes for the authentication related endpoints
const router = Router()

router.post("/login",authController.login)
router.post("/register",authController.register) //this route is used to register a new user
router.get("/get-me",authController.getMe) //this route is used to get the details of the logged in user
router.get("/refresh-token",authController.refreshToken)
router.get("/logout",authController.logout)
router.get("/logoutAll",authController.logoutAll)
router.get("/verify-email",authController.verifyEmail)

export default router