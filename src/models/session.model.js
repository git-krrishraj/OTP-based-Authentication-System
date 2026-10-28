//to implement logout from all devices features we have to implement sessions 

import mongoose from 'mongoose'
import { refreshToken } from '../controllers/auth.controller.js'

const sessionSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        required:[true,"user id is required"],
        ref:"users"
    },
    refreshTokenHash:{
        type:String,
        required:[true,"Refresh token is required"]
    },
    ip:{
        type:String,
        required:[true,"ip adress is expired"]
    },
    userAgent:{
        type:String,
        required:[true,"user agent/browser is required"]//its a string that identifies the browser and operating system of the user
    },
    revoke:{
        type:Boolean,
        default:false
    }
},{timestamps:true})


const sessionModel = mongoose.model("session",sessionSchema)

export default sessionModel