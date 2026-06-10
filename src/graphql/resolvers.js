// src/graphql/resolvers.js
const { DateTimeResolver, JSONResolver } = require('graphql-scalars');
const authService = require('../services/auth.service');
const blogService = require('../services/blog.service');
const emailService = require('../services/email.service');
const emailQueue = require('../queues/email.queue');
const slugify = require('slugify');

const resolvers = {
  DateTime: DateTimeResolver,
  JSON: JSONResolver,

  Query: {
    // Auth
    me: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return user;
    },

    users: async (_, __, { user, isAdmin, prisma }) => {
      if (!isAdmin) throw new Error('Admin access required');
      return await prisma.user.findMany();
    },

    // Blogs
    blogs: async (_, args, { prisma }) => {
      return await blogService.getBlogs(args);
    },

    blog: async (_, { id, slug }, { prisma }) => {
      return await blogService.getBlog(id, slug);
    },

    // Services
    services: async (_, { activeOnly }, { prisma }) => {
      const where = activeOnly ? { isActive: true } : {};
      return await prisma.service.findMany({
        where,
        orderBy: { orderIndex: 'asc' }
      });
    },

    service: async (_, { id, slug }, { prisma }) => {
      const where = id ? { id: parseInt(id) } : { slug };
      return await prisma.service.findUnique({ where });
    },

    // About Us
    aboutUs: async (_, __, { prisma }) => {
      return await prisma.aboutUs.findFirst();
    },

    // Contacts (Admin only)
    contacts: async (_, { unreadOnly, limit }, { user, isAdmin, prisma }) => {
      if (!isAdmin) throw new Error('Admin access required');
      const where = unreadOnly !== undefined ? { isRead: !unreadOnly } : {};
      return await prisma.contact.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' }
      });
    },

    contact: async (_, { id }, { user, isAdmin, prisma }) => {
      if (!isAdmin) throw new Error('Admin access required');
      return await prisma.contact.findUnique({ where: { id: parseInt(id) } });
    },

    // Policies
    policies: async (_, { type }, { prisma }) => {
      const where = { isActive: true };
      if (type) where.type = type;
      return await prisma.policy.findMany({ where });
    },

    policy: async (_, { type }, { prisma }) => {
      return await prisma.policy.findFirst({
        where: { type, isActive: true }
      });
    },

    // Subscribers (Admin only)
    subscribers: async (_, { activeOnly }, { user, isAdmin, prisma }) => {
      if (!isAdmin) throw new Error('Admin access required');
      const where = activeOnly ? { isActive: true } : {};
      return await prisma.subscriber.findMany({
        where,
        include: { blogs: true }
      });
    },

    // Campaigns (Admin only)
    campaigns: async (_, { limit }, { user, isAdmin, prisma }) => {
      if (!isAdmin) throw new Error('Admin access required');
      return await prisma.emailCampaign.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { blog: true }
      });
    }
  },

  Mutation: {
    // Auth
    signUp: async (_, { input }) => {
      return await authService.signUp(input);
    },

    signIn: async (_, { input }) => {
      return await authService.signIn(input);
    },

    // Blog CRUD
    createBlog: async (_, { input }, { user, isAdmin }) => {
      if (!user) throw new Error('Authentication required');
      return await blogService.createBlog(input, user.id);
    },

    updateBlog: async (_, { id, input }, { user, isAdmin }) => {
      if (!user) throw new Error('Authentication required');
      return await blogService.updateBlog(id, input, user.id, isAdmin);
    },

    deleteBlog: async (_, { id }, { user, isAdmin }) => {
      if (!user) throw new Error('Authentication required');
      return await blogService.deleteBlog(id, user.id, isAdmin);
    },

    // Service CRUD
    createService: async (_, { input }, { user, isAdmin, prisma }) => {
      if (!isAdmin) throw new Error('Admin access required');
      
      const slug = `${slugify(input.title, { lower: true })}-${Date.now().toString(36)}`;
      
      return await prisma.service.create({
        data: { ...input, slug }
      });
    },

    updateService: async (_, { id, input }, { user, isAdmin, prisma }) => {
      if (!isAdmin) throw new Error('Admin access required');
      
      return await prisma.service.update({
        where: { id: parseInt(id) },
        data: input
      });
    },

    deleteService: async (_, { id }, { user, isAdmin, prisma }) => {
      if (!isAdmin) throw new Error('Admin access required');
      
      await prisma.service.delete({ where: { id: parseInt(id) } });
      return { success: true, message: 'Service deleted', id };
    },

    // About Us
    updateAboutUs: async (_, { input }, { user, isAdmin, prisma }) => {
      if (!isAdmin) throw new Error('Admin access required');
      
      const existing = await prisma.aboutUs.findFirst();
      
      if (existing) {
        return await prisma.aboutUs.update({
          where: { id: existing.id },
          data: input
        });
      }
      
      return await prisma.aboutUs.create({ data: input });
    },

    // Contact
    createContact: async (_, { input }, { prisma }) => {
      return await prisma.contact.create({ data: input });
    },

    markContactRead: async (_, { id, read }, { user, isAdmin, prisma }) => {
      if (!isAdmin) throw new Error('Admin access required');
      
      return await prisma.contact.update({
        where: { id: parseInt(id) },
        data: { isRead: read }
      });
    },

    deleteContact: async (_, { id }, { user, isAdmin, prisma }) => {
      if (!isAdmin) throw new Error('Admin access required');
      
      await prisma.contact.delete({ where: { id: parseInt(id) } });
      return { success: true, message: 'Contact deleted', id };
    },

    // Policy CRUD
    createPolicy: async (_, { input }, { user, isAdmin, prisma }) => {
      if (!isAdmin) throw new Error('Admin access required');
      
      // Deactivate existing policy of same type
      await prisma.policy.updateMany({
        where: { type: input.type, isActive: true },
        data: { isActive: false }
      });
      
      return await prisma.policy.create({
        data: { ...input, isActive: true }
      });
    },

    updatePolicy: async (_, { id, input }, { user, isAdmin, prisma }) => {
      if (!isAdmin) throw new Error('Admin access required');
      
      return await prisma.policy.update({
        where: { id: parseInt(id) },
        data: input
      });
    },

    deletePolicy: async (_, { id }, { user, isAdmin, prisma }) => {
      if (!isAdmin) throw new Error('Admin access required');
      
      await prisma.policy.delete({ where: { id: parseInt(id) } });
      return { success: true, message: 'Policy deleted', id };
    },

    // Email Marketing
   subscribe: async (_, { input }, { prisma }) => {
  try {
    // CHECK EXISTING SUBSCRIBER
    const existing = await prisma.subscriber.findUnique({
      where: { email: input.email },
    });

    // =========================================
    // ALREADY EXISTS
    // =========================================
    if (existing) {
      // Reactivate inactive subscriber
      if (!existing.isActive) {
        await prisma.subscriber.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            confirmed: true,
          },
        });

        // SEND WELCOME BACK EMAIL
        await emailService.sendWelcomeEmail(input.email);

        return {
          success: true,
          message: "Welcome back! Subscription reactivated.",
          id: existing.id,
        };
      }

      return {
        success: false,
        message: "Already subscribed",
        id: existing.id,
      };
    }

    // =========================================
    // CREATE NEW SUBSCRIBER
    // =========================================
    const subscriber = await prisma.subscriber.create({
      data: {
        email: input.email,
        fullName: input.fullName || null,

        // AUTO-CONFIRM
        confirmed: true,

        isActive: true,

        blogs: input.blogIds
          ? {
              connect: input.blogIds.map((id) => ({
                id: parseInt(id),
              })),
            }
          : undefined,
      },
    });

    // =========================================
    // SEND PROFESSIONAL WELCOME EMAIL
    // =========================================
    await emailService.sendWelcomeEmail(input.email);

    return {
      success: true,
      message: "Successfully subscribed to weekly newsletter",
      id: subscriber.id,
    };
  } catch (error) {
    console.error("SUBSCRIBE ERROR:", error);

    throw new Error(
      error.message || "Failed to subscribe. Please try again."
    );
  }
},

    unsubscribe: async (_, { email }, { prisma }) => {
      const subscriber = await prisma.subscriber.findUnique({ where: { email } });
      
      if (!subscriber) {
        return { success: false, message: 'Email not found' };
      }

      await prisma.subscriber.update({
        where: { id: subscriber.id },
        data: { isActive: false }
      });

      return { success: true, message: 'Successfully unsubscribed' };
    },

    confirmSubscription: async (_, { token }, { prisma }) => {
      const subscriber = await prisma.subscriber.findFirst({ where: { token } });
      
      if (!subscriber) {
        return { success: false, message: 'Invalid token' };
      }

      await prisma.subscriber.update({
        where: { id: subscriber.id },
        data: { confirmed: true, token: null }
      });

      return { success: true, message: 'Subscription confirmed' };
    },

    sendMarketingEmail: async (_, { subject, content, blogId, sendToAll, specificEmails }, { user, isAdmin, prisma }) => {
      if (!isAdmin) throw new Error('Admin access required');

      let emails = [];
      
      if (sendToAll) {
        const subscribers = await prisma.subscriber.findMany({
          where: { isActive: true, confirmed: true }
        });
        emails = subscribers.map(s => s.email);
      } else if (specificEmails) {
        emails = specificEmails;
      }

      if (emails.length > 0) {
        await emailQueue.add('marketing', {
          subject,
          content,
          emails
        });

        await prisma.emailCampaign.create({
          data: {
            subject,
            content,
            status: 'scheduled',
            recipientCount: emails.length,
            blogId: blogId ? parseInt(blogId) : null
          }
        });
      }

      return { success: true, message: `Marketing email queued for ${emails.length} recipients` };
    }
  },

  // Field resolvers
  Blog: {
    author: async (parent, _, { prisma }) => {
      if (parent.author) return parent.author;
      return await prisma.user.findUnique({ where: { id: parent.authorId } });
    }
  },

  Subscriber: {
    blogs: async (parent, _, { prisma }) => {
      return await prisma.blog.findMany({
        where: { subscribers: { some: { id: parent.id } } }
      });
    }
  },
  contactReplies: async (_, { contactId }, { prisma }) => {
  return prisma.contactReply.findMany({
    where: { contactId: parseInt(contactId) },
    orderBy: { createdAt: "asc" },
  });
},
sendContactReply: async (_, { contactId, message }, { prisma }) => {
  const contact = await prisma.contact.findUnique({
    where: { id: parseInt(contactId) },
  });

  if (!contact) throw new Error("Contact not found");

  // save reply in DB
  await prisma.contactReply.create({
    data: {
      contactId: contact.id,
      message,
      sender: "admin",
    },
  });

  // send email to user
  await emailService.sendSingleEmail(
    contact.email,
    `Re: ${contact.subject || "Your message"}`,
    `
      <p>${message}</p>
      <hr/>
      <p style="font-size:12px;color:#888">
        Reply from support team
      </p>
    `
  );

  return { success: true };
}
};

module.exports = resolvers;