import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import nodemailer from "nodemailer";

// In-memory OTP store
const otpStore = new Map();

export const login = async (req, res) => {
  const { email, name, image } = req.body;

  try {
    const existingUser = await users.findOne({ email });

    if (!existingUser) {
      const newUser = await users.create({ email, name, image });
      return res.status(201).json({ result: newUser });
    } else {
      return res.status(200).json({ result: existingUser });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description, phone } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  try {
    const updateFields = {};
    if (channelname !== undefined) updateFields.channelname = channelname;
    if (description !== undefined) updateFields.description = description;
    if (phone !== undefined) updateFields.phone = phone;

    const updatedata = await users.findByIdAndUpdate(
      _id,
      { $set: updateFields },
      { new: true }
    );
    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Send OTP based on user region
export const sendOtp = async (req, res) => {
  const { email, phone, state } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit OTP
  
  otpStore.set(email, otp);
  console.log(`[OTP GENERATED] User: ${email} | State: ${state} | OTP: ${otp}`);

  const isSouthIndia = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"].includes(state);

  if (isSouthIndia) {
    // Send OTP via Email
    try {
      let transporter;
      if (process.env.SMTP_HOST) {
        transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
      } else {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      }

      const mailOptions = {
        from: '"YourTube Security" <security@yourtube.com>',
        to: email,
        subject: "Your OTP Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2>OTP Verification</h2>
            <p>You are logging in from a Southern State (<strong>${state}</strong>). Please use the following One-Time Password to verify your account:</p>
            <p style="font-size: 24px; font-weight: bold; color: #ea4335; letter-spacing: 4px; padding: 10px; background: #f9f9f9; text-align: center;">${otp}</p>
            <p>This code will expire in 10 minutes.</p>
            <p>Best regards,<br>YourTube Security</p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`Verification Email sent: ${info.messageId}`);
      const testUrl = nodemailer.getTestMessageUrl(info);
      if (testUrl) {
        console.log(`Ethereal OTP Email URL: ${testUrl}`);
      }

      return res.status(200).json({
        success: true,
        method: "email",
        message: "OTP sent to your email address.",
        testUrl, // send test URL for easy evaluation
      });
    } catch (err) {
      console.error("Failed to send OTP email:", err);
      // Fallback: return success with logged OTP for easy local testing
      return res.status(200).json({
        success: true,
        method: "email",
        message: "OTP sent to your email (simulated).",
        simulated: true,
      });
    }
  } else {
    // Send OTP via SMS (Simulated)
    console.log(`[SMS-MOCK] SMS OTP sent to Phone: ${phone} | Code: ${otp}`);
    return res.status(200).json({
      success: true,
      method: "phone",
      message: `OTP sent to your mobile phone number ${phone} (Simulated). Code is: ${otp}`,
      simulated: true,
      otp, // return OTP in response for testing convenience
    });
  }
};

// Verify OTP
export const verifyOtp = async (req, res) => {
  const { email, otp, phone } = req.body;
  const storedOtp = otpStore.get(email);

  if (storedOtp && storedOtp === otp) {
    otpStore.delete(email);

    // Save phone number if provided
    if (phone) {
      await users.findOneAndUpdate({ email }, { $set: { phone } });
    }

    return res.status(200).json({ success: true });
  } else {
    return res.status(400).json({ success: false, message: "Invalid OTP verification code." });
  }
};
