import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import { env } from '../config/env';
import { AuthUser, UserRole } from '../types';

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateAccessToken(user: AuthUser): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN as any }
    );
  }

  static generateRefreshToken(user: AuthUser): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any }
    );
  }

  static async register(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role?: UserRole;
    departmentId?: string;
  }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw { statusCode: 409, code: 'EMAIL_ALREADY_EXISTS', message: 'An account with this email already exists' };
    }

    const passwordHash = await this.hashPassword(data.password);
    const assignedRole: UserRole = data.role || 'CITIZEN';

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        phone: data.phone,
        role: assignedRole,
        profile: {
          create: {
            departmentId: data.departmentId,
            notificationsEnabled: true,
            emailNotifications: true,
          },
        },
      },
      include: {
        profile: {
          include: {
            department: true,
          },
        },
      },
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      name: user.name,
    };

    const accessToken = this.generateAccessToken(authUser);
    const refreshToken = this.generateRefreshToken(authUser);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        profile: user.profile,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    };
  }

  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        profile: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
    }

    const isValid = await this.comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      name: user.name,
    };

    const accessToken = this.generateAccessToken(authUser);
    const refreshToken = this.generateRefreshToken(authUser);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        profile: user.profile,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    };
  }

  static async refresh(token: string) {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: string; email: string };
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user || !user.isActive) {
        throw { statusCode: 401, code: 'USER_NOT_FOUND', message: 'User session invalid' };
      }

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
        name: user.name,
      };

      const newAccessToken = this.generateAccessToken(authUser);
      const newRefreshToken = this.generateRefreshToken(authUser);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch {
      throw { statusCode: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token expired or invalid' };
    }
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!user) {
      throw { statusCode: 404, code: 'USER_NOT_FOUND', message: 'User profile not found' };
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      profile: user.profile,
      createdAt: user.createdAt,
    };
  }
}
