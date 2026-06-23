import Razorpay from "razorpay";
import crypto from "crypto";
import users from "../Modals/Auth.js";
import downloads from "../Modals/Download.js";
import nodemailer from "nodemailer";

// Simple Razorpay test client setup
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_51234567890abcdef",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "mock_key_secret_value",
});

// Helper to send invoice emails
const sendInvoiceEmail = async (userEmail, name, planName, amount) => {
  try {
    // We attempt Ethereal (fake SMTP provider) for out-of-the-box local testing
    // or use custom SMTP if provided in environmental variables.
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
      // Ethereal auto-generated mock account
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
      from: '"YourTube Premium" <premium@yourtube.com>',
      to: userEmail,
      subject: `Invoice for YourTube ${planName} Upgrade`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; border: 1px solid #eee;">
          <h2 style="color: #ea4335;">YourTube Premium Invoice</h2>
          <p>Hi ${name || "Subscriber"},</p>
          <p>Thank you for upgrading! Your subscription to the <strong>${planName}</strong> plan is now active.</p>
          <hr />
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Receipt No:</td>
              <td style="padding: 8px 0; text-align: right;">REC-${Date.now()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Plan:</td>
              <td style="padding: 8px 0; text-align: right; text-transform: uppercase;">${planName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Amount Paid:</td>
              <td style="padding: 8px 0; text-align: right; font-size: 16px; color: #ea4335; font-weight: bold;">₹${amount}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Status:</td>
              <td style="padding: 8px 0; text-align: right; color: green; font-weight: bold;">PAID (SUCCESS)</td>
            </tr>
          </table>
          <hr />
          <p>Best regards,<br><strong>The YourTube Team</strong></p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Invoice email sent: ${info.messageId}`);
    
    // Log the Ethereal testing URL so the user can preview the sent email
    const testUrl = nodemailer.getTestMessageUrl(info);
    if (testUrl) {
      console.log(`Ethereal Mail Preview URL: ${testUrl}`);
    }
  } catch (error) {
    console.error("Failed to send invoice email:", error);
  }
};

// Create a Razorpay Order
export const createOrder = async (req, res) => {
  const { amount, currency = "INR" } = req.body;
  try {
    const options = {
      amount: amount * 100, // Razorpay works in paise
      currency,
      receipt: `receipt_order_${Date.now()}`,
    };
    const order = await razorpay.orders.create(options);
    return res.status(200).json(order);
  } catch (error) {
    console.error("Razorpay order creation failed:", error);
    // Return mock order if Razorpay connection fails or credentials aren't configured
    console.log("Falling back to simulated Razorpay order ID...");
    return res.status(200).json({
      id: `order_mock_${Date.now()}`,
      amount: amount * 100,
      currency,
      simulated: true,
    });
  }
};

// Verify payment and upgrade plan
export const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, planName, amount } = req.body;

  try {
    let isValid = false;

    // Check if it's a simulated order
    if (razorpay_order_id && razorpay_order_id.startsWith("order_mock_")) {
      isValid = true;
    } else {
      // Real Razorpay signature check
      const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "mock_key_secret_value");
      hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
      const generatedSignature = hmac.digest("hex");
      isValid = generatedSignature === razorpay_signature;
    }

    if (isValid) {
      // Upgrade user plan
      const updatedUser = await users.findByIdAndUpdate(
        userId,
        { $set: { plan: planName } },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Send invoice email asynchronously
      sendInvoiceEmail(updatedUser.email, updatedUser.name, planName, amount);

      return res.status(200).json({ success: true, user: updatedUser });
    } else {
      return res.status(400).json({ message: "Payment verification failed" });
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Download logic
export const recordDownload = async (req, res) => {
  const { userId, videoId } = req.body;
  try {
    const user = await users.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const todayStr = new Date().toDateString();

    // Check limits if plan is Free
    if (!user.plan || user.plan === "Free") {
      if (user.lastDownloadDate === todayStr && user.downloadCount >= 1) {
        return res.status(403).json({
          limitReached: true,
          message: "Free users can only download one video per day. Please upgrade to Premium!",
        });
      }

      // Update today's download count
      const newCount = user.lastDownloadDate === todayStr ? user.downloadCount + 1 : 1;
      await users.findByIdAndUpdate(userId, {
        $set: { lastDownloadDate: todayStr, downloadCount: newCount },
      });
    }

    // Save download record
    const newDownload = new downloads({ userId, videoId });
    await newDownload.save();

    return res.status(200).json({ success: true, download: newDownload });
  } catch (error) {
    console.error("Download recording failed:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Get User Downloads
export const getUserDownloads = async (req, res) => {
  const { userId } = req.params;
  try {
    const userDownloads = await downloads.find({ userId }).populate("videoId");
    return res.status(200).json(userDownloads);
  } catch (error) {
    console.error("Failed to retrieve user downloads:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
