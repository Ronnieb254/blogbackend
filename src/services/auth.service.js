// src/services/auth.service.js
const bcrypt = require('bcryptjs');
const prisma = require('../database/prisma');
const { generateToken } = require('../utils/jwt');

class AuthService {
  async signUp({ email, password, fullName }) {
    // Check existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        isAdmin: false // First user could be made admin via seed
      }
    });

    const token = generateToken(user.id);
    
    return {
      token,
      user: {
        ...user,
        password: undefined // Remove password from response
      },
      success: true,
      message: 'Registration successful'
    };
  }

  async signIn({ email, password }) {
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const token = generateToken(user.id);

    return {
      token,
      user: {
        ...user,
        password: undefined
      },
      success: true,
      message: 'Login successful'
    };
  }
}

module.exports = new AuthService();