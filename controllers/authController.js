const User = require('../models/User');
const jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator');
const { sendEmail } = require('../utils/email');

const generateToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const generateAndSaveOTP = async (user) => {
    const otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
    });

    user.otp = otp;                    // ← storing plain OTP (common for short-lived codes)
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    return otp;
};

// ──────────────────────────────────────────────
// REGISTER FLOW
// ──────────────────────────────────────────────

exports.registerSendOTP = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const cleanEmail = email.trim().toLowerCase();
        let user = await User.findOne({ email: cleanEmail });

        if (user && user.isVerified) {
            return res.status(400).json({ message: 'User already exists and is verified' });
        }

        if (!user) {
            user = new User({ name, email: cleanEmail, password });
        } else {
            user.name = name;
            user.password = password; // will be hashed in pre-save
        }

        const otp = await generateAndSaveOTP(user);

        await sendEmail(
            cleanEmail,
            'Verify Your Email',
            `Your OTP is ${otp}. It expires in 10 minutes.`
        );

        res.json({ message: 'OTP sent to email' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.verifyOTPAndRegister = async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.isVerified) {
            return res.status(400).json({ message: 'Account already verified' });
        }

        if (!user.otp || user.otp !== otp || !user.otpExpires || user.otpExpires < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.json({ message: 'Account verified successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ──────────────────────────────────────────────
// LOGIN
// ──────────────────────────────────────────────

exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email: email.trim().toLowerCase() });

        if (!user || !user.isVerified) {
            return res.status(401).json({ message: 'Invalid credentials or account not verified' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ──────────────────────────────────────────────
// FORGOT / RESET PASSWORD
// ──────────────────────────────────────────────

exports.forgotPasswordSendOTP = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) {
            // Security: don't reveal whether email exists
            return res.json({ message: 'If the email exists, OTP has been sent' });
        }

        const otp = await generateAndSaveOTP(user);

        await sendEmail(
            user.email,
            'Password Reset OTP',
            `Your OTP is ${otp}. It expires in 10 minutes.`
        );

        res.json({ message: 'If the email exists, OTP has been sent' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.resetPasswordWithOTP = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!user.otp || user.otp !== otp || !user.otpExpires || user.otpExpires < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        user.password = newPassword; // hashed by pre-save
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.json({ message: 'Password reset successful' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ──────────────────────────────────────────────
// RESEND OTP (used by both flows)
// ──────────────────────────────────────────────

exports.resendOTP = async (req, res) => {
    const { email, type } = req.body; // type: 'register' | 'reset'

    try {
        const cleanEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: cleanEmail });

        if (!user) {
            return res.status(404).json({ message: 'No account found' });
        }

        if (type === 'register' && user.isVerified) {
            return res.status(400).json({ message: 'Account already verified' });
        }

        const otp = await generateAndSaveOTP(user);

        const subject = type === 'register'
            ? 'Verify Your Email'
            : 'Password Reset OTP';

        await sendEmail(
            cleanEmail,
            subject,
            `Your OTP is ${otp}. It expires in 10 minutes.`
        );

        res.json({ message: 'OTP resent successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};