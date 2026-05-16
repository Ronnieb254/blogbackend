// src/services/email.service.js

const nodemailer = require("nodemailer");
const config = require("../config");
const prisma = require("../database/prisma");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465, // FIXED
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS, // MUST be Gmail App Password
      },
    });

    // DEBUG SMTP CONNECTION
    this.transporter.verify((error, success) => {
      if (error) {
        console.log("❌ SMTP ERROR:", error.message);
      } else {
        console.log("✅ SMTP READY");
      }
    });
  }

  async sendNewsletter(blogId) {
    const blog = await prisma.blog.findUnique({
      where: { id: blogId },
      include: { author: true },
    });

    if (!blog || !blog.published) return;

    const subscribers = await prisma.subscriber.findMany({
      where: { isActive: true, confirmed: true },
    });

    const emails = subscribers.map((s) => s.email);

    if (!emails.length) return;

    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c3e50;">${blog.title}</h2>
            <p>${(blog.excerpt || blog.content || "").substring(0, 200)}...</p>

            <a href="${config.FRONTEND_URL}/blog/${blog.slug}" 
               style="display:inline-block;padding:12px 24px;background:#3498db;
                      color:white;text-decoration:none;border-radius:5px;margin-top:20px;">
              Read Full Article
            </a>
          </div>
        </body>
      </html>
    `;

    await this.sendBulkEmail(
      emails,
      `New Post: ${blog.title}`,
      htmlContent
    );

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

  // ✅ SAFE BULK EMAIL (NO GMAIL BLOCKING)
  async sendBulkEmail(to, subject, html) {
    const batchSize = 50;
    const batches = [];

    for (let i = 0; i < to.length; i += batchSize) {
      batches.push(to.slice(i, i + batchSize));
    }

    for (const batch of batches) {
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