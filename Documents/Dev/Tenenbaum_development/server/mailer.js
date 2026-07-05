import nodemailer from "nodemailer";

/**
 * Email transport. If SMTP credentials are configured via environment
 * variables a real transporter is used; otherwise we fall back to logging the
 * message to the console so the app works end-to-end out of the box in dev.
 */
let transporter = null;
const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

if (hasSmtp) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM = process.env.MAIL_FROM || "Tenenbaum Website <no-reply@tenenbaum.example.com>";
const TO = process.env.MAIL_TO || process.env.SMTP_USER || "hello@tenenbaum.example.com";

export async function sendContactEmail(data) {
  const subject = `New enquiry: ${data.subject} — ${data.name}`;
  const text = [
    `Name: ${data.name}`,
    `Company: ${data.company || "—"}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone || "—"}`,
    `Subject: ${data.subject}`,
    "",
    data.message,
  ].join("\n");

  const html = `
    <h2 style="font-family:Georgia,serif;color:#241924">New enquiry via tenenbaum.com</h2>
    <table style="font-family:Arial,sans-serif;font-size:14px;color:#241924">
      <tr><td style="padding:4px 12px 4px 0"><b>Name</b></td><td>${escapeHtml(data.name)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><b>Company</b></td><td>${escapeHtml(data.company || "—")}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><b>Email</b></td><td>${escapeHtml(data.email)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><b>Phone</b></td><td>${escapeHtml(data.phone || "—")}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><b>Subject</b></td><td>${escapeHtml(data.subject)}</td></tr>
    </table>
    <p style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap;color:#241924">${escapeHtml(data.message)}</p>
  `;

  if (!transporter) {
    console.log("\n📬 [DEV] Contact email (SMTP not configured):\n", text, "\n");
    return { delivered: false, mocked: true };
  }

  await transporter.sendMail({
    from: FROM,
    to: TO,
    replyTo: data.email,
    subject,
    text,
    html,
  });
  return { delivered: true };
}

export async function sendNewsletterWelcome(email) {
  if (!transporter) {
    console.log(`\n📨 [DEV] Newsletter signup (SMTP not configured): ${email}\n`);
    return { delivered: false, mocked: true };
  }
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: "Welcome to Tenenbaum Perspectives",
    text: "Thank you for subscribing. We'll be in touch with occasional, substantive notes on strategy and leadership.",
  });
  return { delivered: true };
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
