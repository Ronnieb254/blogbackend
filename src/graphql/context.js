// src/graphql/context.js
const { verifyToken } = require('../utils/jwt');
const prisma = require('../database/prisma');

const createContext = async ({ req }) => {
  const context = {
    prisma,
    user: null,
    isAdmin: false
  };

  // Get token from header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (decoded && decoded.userId) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });
      
      if (user && user.isActive) {
        context.user = user;
        context.isAdmin = user.isAdmin;
      }
    }
  }

  return context;
};

module.exports = createContext;