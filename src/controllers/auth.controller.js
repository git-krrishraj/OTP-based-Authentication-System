import mongoose from 'mongoose'
import config from '../config/config.js'
import userModel from '../models/user.model.js'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import sessionModel from '../models/session.model.js'
import sendEmail from '../services/email.service.js'
import { getOtpHtml, generateOtp } from '../utils/utils.js'
import otpModel from '../models/otp.model.js'
import { access } from 'fs'
import { MessageCircleOff } from 'lucide-react'
import { use } from 'react'
//this file is used to write the logic of the api endpoints related to authentication like register, login, etc


const login=async (req,res)=>{
    const {email,password}=req.body

    if(!email || !password)
    {
        return res.status(400).json({
            message:'Please provide all required fields'
        })
    }

   const user=await userModel.findOne({email})

   if(!user)
   {
    return res.status(401).json({
        message:'Invald Credentials'
    })
   }

   if(!user.verified)
   {
    return res.status(401).json({
        message : 'email is not verified'
    })
   }

   const passwordHash=crypto.createHash('sha256').update(password).digest('hex')

   if(user.password!==passwordHash)
   {
    return res.status(401).json({
        message:"Invalid Password"
    })
   }

   const refreshToken=jwt.sign({
    userId:user._id
   },config.JWT_SECRET,
    {
        expiresIn:'7d'
    })

    const refreshTokenHash=crypto.createHash('sha256').update(refreshToken).digest('hex')

    const session=await sessionModel.create({
        userId:user._id,
        refreshTokenHash,
        ip:req.ip,
        userAgent:req.headers["user-agent"]
    })

    const accessToken=jwt.sign({
        userId:user._id,
        sessionId:session._id
    },config.JWT_SECRET,
    {
        expiresIn:'15m'
    })

    res.cookie('refreshToken',refreshToken,{
        httpOnly:true,
        secure:true,
        sameSite:"strict",
        maxAge:7*24*60*60*1000 
    })

    res.status(200).json({
        message:'logged in successfully',
        user,
        accessToken
    })

}
const register= async (req,res)=>{
    const {username,email,password}=req.body //this is used to get the data from the request body
    if(!username || !email || !password)
    {
        return res.status(400).json({
            message : "Please provide all the required fields"
        })
    }

    const isAlreadyRegistered = await userModel.findOne({
        $or:[
            {username:username},
            {email:email}
        ]
    })

    if(isAlreadyRegistered)
    {
        return res.status(409).json({
            message : "User already registered"
        })
    }

    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex')   
    

//now we have confirmed that the user is not already registered so we can create a new user

//we store the password in the database as a hash instead of plain text for security reasons so we need to hash the password before storing it in the database
    const newUser = await userModel.create({
        username : username,
        email : email,
        password : hashedPassword 
    })
    
    const otp=generateOtp()
    const otpHtml=getOtpHtml(otp)

    const otpHash=crypto.createHash('sha256').update(otp).digest('hex')

    const otpStored = await otpModel.create({
        email,
        user: newUser._id,
        otpHash
    })

    await sendEmail(email, "Welcome to our app", "Thank you for registering with us. We are excited to have you on board!", otpHtml)

    //below code is hashed now because we now allow only login functionality to create a refresh token and access token only after user has verified their email

    // const refreshToken= jwt.sign({userId: newUser._id},config.JWT_SECRET,{expiresIn:"7d"})

    // const refreshTokenHash= crypto.createHash("sha256").update(refreshToken).digest("hex")

    // const session = await sessionModel.create({
    //     userId : newUser._id,
    //     refreshTokenHash,
    //     ip:req.ip,
    //     revoke:false,
    //     userAgent : req.headers["user-agent"]
    // })

    // const accessToken = jwt.sign({userId : newUser._id, sessionId:session._id},config.JWT_SECRET,{expiresIn : '15m'}) //this is used to create a jwt token for the user which will be used for authentication

    // res.cookie("refreshToken",refreshToken,{
    //     httpOnly:true,//client side js cannot access this cookie so that it cannot be stolen by malicious scripts
    //     secure:true,//this cookie will only be sent over https so that it cannot be stolen by man in the middle attacks
    //     sameSite:true,//this cookie will only be sent to the same site so that it cannot be stolen by cross site scripting attacks
    //     maxAge:7*24*60*60*1000
    // })//storing it in cookies so that even if it gets sent then the action wont happen due to lack of accesstoken

    return res.status(201).json({
        message : "User registered successfully",
        user : newUser,
        // accessToken , we need to send accesstoken in response so that we can store it in memory in client side
        verified: newUser.verified 
    })
    
}

const getMe= async (req,res)=>{
    const token = req.headers.authorization?.split(" ")[1]
    if(!token)
    {
        return res.status(401).json({
            message : "Unauthorized"
        })
    }
    //user will not have any token if they are not logged in or registered so we will return an error if the token is not present in the request headers

    //if the token is present then we will verify the token and get the user id from the token and then we will get the user details from the database using the user id
    const decodedToken = jwt.verify(token,config.JWT_SECRET)
    if(!decodedToken)
    {
        return res.status(401).json({
            message : "Unauthorized"
        })
    }
    const user = await userModel.findById(decodedToken.userId)

    return res.status(200).json({
        message : "User details retrieved successfully",
        user : user
    })

}

const refreshToken=async (req,res)=>{
    const token = req.cookies.refreshToken

    if(!token)
    {
        return res.status(401).json({
            message:"Unauthorized, refresh token not found"
        })
    }
    const decoded = await jwt.verify(token,config.JWT_SECRET)

    if(!decoded)
    {
        return res.status(401).json({
            message:"invalid refresh token" 
        })
    }

    const refreshTokenHash=crypto.createHash("sha256").update(token).digest("hex")

    const session=await sessionModel.findOne({
        refreshTokenHash
    })

    if(!session)
    {
        return res.status(401).json({
            message:"invalid refresh token"
        })
    }
    
    if(session.revoke===true)
    {
        return res.status(401).json({
            message:"expired refresh token"
        })
    }

    const newRefreshToken = await jwt.sign({userId:decoded.userId},config.JWT_SECRET,{expiresIn:"7d"})
    const newRefreshTokenHash= crypto.createHash("sha256").update(newRefreshToken).digest("hex")
    const newAccessToken = await jwt.sign({userId:decoded.userId },config.JWT_SECRET,{expiresIn:"15m"})

    session.refreshTokenHash=newRefreshTokenHash
    await session.save()

    res.cookie("refreshToken",newRefreshToken,{
        httpOnly:true,
        secure:true,
        sameSite:true,
        maxAge:7*24*60*60*1000
    })

    res.status(200).json({
        message:"Access token refreshed successfully",
        accessToken:newAccessToken  
    })//the moment access  token expires it hits this api which not only updates the acess token but the refresh token too every 15min
}

const logout = async (req,res)=>{
    const refreshToken=req.cookies.refreshToken

    if(!refreshToken)
    {
        return res.status(400).json({
            message:"Refresh token not found"
        })
    }

    const refreshTokenHash=crypto.createHash('sha256').update(refreshToken).digest('hex')

    const session=await sessionModel.findOne({
        refreshTokenHash,
        revoke:false
    })

    if(!session)
    {
        return res.status(400).json({
            message:"Session already revoked"
        })
    }

    session.revoke=true
    await session.save()

    res.clearCookie('refreshToken')

    res.status(200).json({
        message : "Logged out successfully"
    })
}

const logoutAll=async (req,res)=>{
    const refreshToken=req.cookies.refreshToken;

    if(!refreshToken)
    {
        return res.status(401).json({
            message:"Refresh token not found"
        })
    }

    const decoded=jwt.verify(refreshToken,config.JWT_SECRET);

    if(!decoded)
    {
        return res.status(400).json({
            message : "Invalid refresh token"
        })
    }

    await sessionModel.updateMany({
        userId:decoded.userId,
        revoke:false
    },{
        revoke:true
    })

    res.clearCookie()

    res.status(200).json({
        message:'logged out from all devices'
    })
}

const verifyEmail = async (req,res)=>{
    const {otp,email}=req.body

    if(!otp||!email)
    {
        return res.status(400).json({
            message : "otp or email not found"
        })
    }

    const otpHash=crypto.createHash('sha256').update(otp).digest('hex')

    const isOtpFound=await otpModel.findOne({
        otpHash,
        email   
    })

    if(!isOtpFound)
    {
        return res.status(401).json({
            message:"Invalid OTP or email not registered"
        })
    }

    const user=await userModel.findByIdAndUpdate(isOtpFound.user,{verified:true})
    
    //now deleting all the otps requested by that user/email

    await otpModel.deleteMany({
        user:isOtpFound.user
    })

    return res.status(200).json({
        message:"user verified"
    })
}

export {register, getMe, refreshToken, logout, logoutAll, login,verifyEmail}