import mongoose from 'mongoose'
import config from './config.js'
const connectDB=async ()=>{
    try{
        await mongoose.connect(config.MONGO_URI)
    }
    catch(err){
        throw new Error("Error connecting to the database")
    }
}

export default connectDB