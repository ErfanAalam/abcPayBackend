import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(to: string, otp: string) {
  await transporter.sendMail({
    from: `"AbcPay" <${process.env.SMTP_USER}>`,
    to,
    subject: "Verify your email - AbcPay",
    html: `
      <div style="font-family: sans-serif; padding: 20px; background: #0f172a; color: #fff; border-radius: 12px;">
        <h2 style="color: #6366f1;">AbcPay Email Verification</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing: 8px; color: #22d3ee; font-size: 32px;">${otp}</h1>
        <p style="color: #94a3b8;">This code expires in 10 minutes.</p>
      </div>
    `,
  });
}
