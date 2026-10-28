import express from 'express'
import morgan from 'morgan'
import authRoutes from './routes/auth.routes.js'
import cookieParser from 'cookie-parser'
//app file is used to setup the server and to set up the routes and middlewares

const app=express()


app.use(morgan('dev')) //this allows us to see the incoming requests in the console it is like a register of all the requests that are coming to the server
app.use(express.json()) //this allows us to parse the incoming request body as JSON
app.use(cookieParser())
app.use('/api/auth',authRoutes) //this sets up the routes for the authentication related endpoints

export default app