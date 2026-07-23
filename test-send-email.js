// Test script: send image as HTML email template via server SMTP config.
const path = require('path');
require(require.resolve('dotenv', { paths: [path.join(__dirname, 'server')] }))
  .config({ path: path.join(__dirname, 'server', '.env') });
const nodemailer = require(require.resolve('nodemailer', { paths: [path.join(__dirname, 'server')] }));

const TO = 'nikhilsharma2847@gmail.com';
const IMAGE_PATH = 'C:\\Users\\sahua\\Downloads\\ChatGPT Image Jul 22, 2026, 11_35_41 PM.png';

async function main() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Connexify Test Email</h2>
      <p>This is test email template with embedded image attachment.</p>
      <img src="cid:testimage" alt="ChatGPT Image" style="max-width: 100%; border-radius: 8px; margin: 16px 0;" />
      <p style="color: #555;">Sent via SMTP test script (server/.env config).</p>
    </div>
  `;

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: TO,
    subject: 'Connexify Test — Image Template',
    html,
    attachments: [
      {
        filename: 'ChatGPT Image Jul 22, 2026, 11_35_41 PM.png',
        path: IMAGE_PATH,
        cid: 'testimage',
      },
    ],
  });

  console.log('Sent:', info.messageId);
}

main().catch((err) => {
  console.error('Send failed:', err);
  process.exit(1);
});
