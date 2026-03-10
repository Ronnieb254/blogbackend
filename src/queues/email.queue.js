// src/queues/email.queue.js
const Queue = require('bull');
const config = require('../config');
const emailService = require('../services/email.service');

const emailQueue = new Queue('email', config.REDIS_URL);

emailQueue.process('new-blog', async (job) => {
  const { blogId } = job.data;
  await emailService.sendNewsletter(blogId);
});

emailQueue.process('marketing', async (job) => {
  const { subject, content, emails } = job.data;
  await emailService.sendBulkEmail(emails, subject, content);
});

module.exports = emailQueue;