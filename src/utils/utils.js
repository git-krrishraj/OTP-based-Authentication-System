const generateOtp = ()=>{
    return Math.floor(100000 + Math.random()*900000).toString() 
}

const getOtpHtml = (otp)=>{
    return `
        <div style="text-align:center;">
            <h1>OTP for your account</h1>
            <p>Your OTP is: <strong>${otp}</strong></p>
        </div>
    `
}

export {generateOtp,getOtpHtml}