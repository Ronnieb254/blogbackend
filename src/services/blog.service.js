// src/services/blog.service.js
const slugify = require('slugify');
const prisma = require('../database/prisma');
const emailQueue = require('../queues/email.queue');

class BlogService {
  async createBlog(input, authorId) {
    const slug = this.generateUniqueSlug(input.title);
    
    const blog = await prisma.blog.create({
      data: {
        ...input,
        slug,
        authorId,
        publishedAt: input.published ? new Date() : null
      },
      include: { author: true }
    });

    // Send email notification if published
    if (input.published) {
      await emailQueue.add('new-blog', { blogId: blog.id });
    }

    return blog;
  }

  async updateBlog(id, input, userId, isAdmin) {
    const existing = await prisma.blog.findUnique({ where: { id: parseInt(id) } });
    
    if (!existing) throw new Error('Blog not found');
    if (existing.authorId !== userId && !isAdmin) {
      throw new Error('Permission denied');
    }

    const wasPublished = existing.published;
    const data = { ...input };
    
    if (input.published && !wasPublished) {
      data.publishedAt = new Date();
    }

    const blog = await prisma.blog.update({
      where: { id: parseInt(id) },
      data,
      include: { author: true }
    });

    // Send notification if newly published
    if (input.published && !wasPublished) {
      await emailQueue.add('new-blog', { blogId: blog.id });
    }

    return blog;
  }

  async deleteBlog(id, userId, isAdmin) {
    const blog = await prisma.blog.findUnique({ where: { id: parseInt(id) } });
    
    if (!blog) throw new Error('Blog not found');
    if (blog.authorId !== userId && !isAdmin) {
      throw new Error('Permission denied');
    }

    await prisma.blog.delete({ where: { id: parseInt(id) } });
    
    return { success: true, message: 'Blog deleted successfully', id };
  }

  async getBlogs({ publishedOnly, limit, offset }) {
    const where = publishedOnly ? { published: true } : {};
    
    return await prisma.blog.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, fullName: true, email: true } } }
    });
  }

  async getBlog(id, slug) {
    const where = id ? { id: parseInt(id) } : { slug };
    return await prisma.blog.findUnique({
      where,
      include: { author: { select: { id: true, fullName: true, email: true } } }
    });
  }

  generateUniqueSlug(title) {
    const baseSlug = slugify(title, { lower: true, strict: true });
    return `${baseSlug}-${Date.now().toString(36)}`;
  }
}

module.exports = new BlogService();
