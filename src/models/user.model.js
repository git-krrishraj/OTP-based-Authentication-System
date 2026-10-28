import mongoose from 'mongoose'
//this file defines the schema for the user model and also creates the user model using the schema
const userSchema = new mongoose.Schema({
    username : {
        type : String,
        required : [true, "Please provide a name"],
        unique : [true, "Username already exists"]
    },
    email :{
        type : String,
        required : [true,"Please provide an email"],
        unique : [true, "Email already exists"]
    },
    password : {
        type : String,
        required : [true, "Please provide a password"]
    },
    verified : {
        type:Boolean,
        default:false
    }
})

const userModel = mongoose.model("User", userSchema)

export default userModel