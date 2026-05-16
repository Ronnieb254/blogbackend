// src/services/email.service.js

const nodemailer = require("nodemailer");
const config = require("../config");
const prisma = require("../database/prisma");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,

      // IMPORTANT: convert env string to number
      port: Number(config.SMTP_PORT),

      // IMPORTANT: secure must match port
      secure: Number(config.SMTP_PORT) === 465,

      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS, // Gmail App Password
      },

      // Prevent TLS/socket issues on some VPS providers
      tls: {
        rejectUnauthorized: false,
      },

      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    // SMTP DEBUG
    this.transporter.verify((error, success) => {
      if (error) {
        console.log("❌ SMTP ERROR:", error);
      } else {
        console.log("✅ SMTP READY");
      }
    });
  }

  // =========================================
  // SEND WELCOME EMAIL AFTER SUBSCRIPTION
  // =========================================
  async sendWelcomeEmail(email) {
    const subject = "Welcome to Our Weekly Newsletter 🚀";

    const html = `
      <html>
        <body style="
          font-family: Arial, sans-serif;
          background:#f3f4f6;
          padding:40px 20px;
          color:#111827;
        ">
          <div style="
            max-width:600px;
            margin:0 auto;
            background:#ffffff;
            border-radius:12px;
            overflow:hidden;
            box-shadow:0 4px 20px rgba(0,0,0,0.08);
          ">

            <!-- HEADER -->
            <div style="
              background:#111827;
              padding:40px 30px;
              text-align:center;
            ">
              <h1 style="
                color:#ffffff;
                margin:0;
                font-size:32px;
                font-weight:bold;
              ">
                Welcome 🎉
              </h1>
            </div>

            <!-- CONTENT -->
            <div style="padding:40px 30px;">

              <h2 style="
                margin-top:0;
                color:#111827;
                font-size:28px;
              ">
                Thanks for subscribing!
              </h2>

              <p style="
                font-size:16px;
                line-height:1.8;
                color:#4b5563;
              ">
                You're officially part of our weekly newsletter community.
              </p>

              <p style="
                font-size:16px;
                line-height:1.8;
                color:#4b5563;
              ">
                Every week you'll receive:
              </p>

              <ul style="
                color:#4b5563;
                line-height:1.9;
                padding-left:20px;
                font-size:16px;
              ">
                <li>🚀 Business & growth insights</li>
                <li>🎨 Creative and branding inspiration</li>
                <li>📈 Marketing strategies that work</li>
                <li>💡 AI and digital trends</li>
                <li>🧠 Actionable tips for creators & entrepreneurs</li>
              </ul>

              <p style="
                font-size:16px;
                line-height:1.8;
                color:#4b5563;
              ">
                We focus on practical ideas, quality content, and real value — not spam.
              </p>

              <!-- BUTTON -->
              <div style="text-align:center; margin:40px 0;">
                <a
                  href="${config.FRONTEND_URL}"
                  style="
                    display:inline-block;
                    padding:14px 28px;
                    background:#111827;
                    color:#ffffff;
                    text-decoration:none;
                    border-radius:8px;
                    font-weight:bold;
                    font-size:16px;
                  "
                >
                  Visit Website
                </a>
              </div>

              <!-- FOOTER -->
              <p style="
                font-size:13px;
                color:#9ca3af;
                margin-top:40px;
                line-height:1.6;
              ">
                You're receiving this email because you subscribed to our newsletter.
              </p>

            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendSingleEmail(email, subject, html);
  }

  // =========================================
  // SEND NEWSLETTER
  // =========================================
  async sendNewsletter(blogId) {
    const blog = await prisma.blog.findUnique({
      where: { id: blogId },
      include: { author: true },
    });

    if (!blog || !blog.published) return;

    const subscribers = await prisma.subscriber.findMany({
      where: {
        isActive: true,
        confirmed: true,
      },
    });

    const emails = subscribers.map((s) => s.email);

    if (!emails.length) return;

    const htmlContent = `
      <html>
        <body style="
          font-family: Arial, sans-serif;
          line-height:1.6;
          color:#333;
          background:#f3f4f6;
          padding:40px 20px;
        ">
          <div style="
            max-width:600px;
            margin:0 auto;
            background:#ffffff;
            padding:40px 30px;
            border-radius:12px;
          ">

            <h2 style="color:#111827; margin-top:0;">
              ${blog.title}
            </h2>

            <p style="
              color:#4b5563;
              font-size:16px;
              line-height:1.8;
            ">
              ${(blog.excerpt || blog.content || "").substring(0, 250)}...
            </p>

            <div style="margin-top:30px;">
              <a
                href="${config.FRONTEND_URL}/blog/${blog.slug}"
                style="
                  display:inline-block;
                  padding:14px 24px;
                  background:#111827;
                  color:#ffffff;
                  text-decoration:none;
                  border-radius:8px;
                  font-weight:bold;
                "
              >
                Read Full Article
              </a>
            </div>

          </div>
        </body>
      </html>
    `;

    await this.sendBulkEmail(
      emails,
      `New Post: ${blog.title}`,
      htmlContent
    );

    // SAVE CAMPAIGN
    await prisma.emailCampaign.create({
      data: {
        subject: `New Post: ${blog.title}`,
        content: htmlContent,
        status: "sent",
        sentAt: new Date(),
        recipientCount: emails.length,
        blogId: blog.id,
      },
    });
  }

  // =========================================
  // BULK EMAIL
  // =========================================
  async sendBulkEmail(to, subject, html) {
    const batchSize = 50;

    for (let i = 0; i < to.length; i += batchSize) {
      const batch = to.slice(i, i + batchSize);

      await Promise.all(
        batch.map((email) =>
          this.transporter.sendMail({
            from: config.FROM_EMAIL,
            to: email,
            subject,
            html,
          })
        )
      );
    }
  }

  // =========================================
  // SINGLE EMAIL
  // =========================================
  async sendSingleEmail(to, subject, html) {
    await this.transporter.sendMail({
      from: config.FROM_EMAIL,
      to,
      subject,
      html,
    });
  }
  
}

module.exports = new EmailService();