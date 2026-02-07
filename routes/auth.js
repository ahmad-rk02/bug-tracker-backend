const express = require('express');
const {
    registerSendOTP,
    verifyOTPAndRegister,
    loginUser,
    forgotPasswordSendOTP,
    resetPasswordWithOTP,
    resendOTP,
} = require('../controllers/authController');

const router = express.Router();

router.post('/register/send-otp', registerSendOTP);
router.post('/register/verify-otp', verifyOTPAndRegister);

router.post('/login', loginUser);

router.post('/forgot-password', forgotPasswordSendOTP);
router.post('/reset-password', resetPasswordWithOTP);

router.post('/resend-otp', resendOTP);

module.exports = router;