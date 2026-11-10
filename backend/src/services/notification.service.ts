import prisma from '../prisma';
import { emitUserNotification } from './socket.service';

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: 'STATUS_CHANGE' | 'ASSIGNMENT' | 'DUPLICATE_ALERT' | 'COMMENT' | 'SYSTEM';
  referenceId?: string;
}

export class NotificationService {
  /**
   * Persists an in-app notification, emits it in real-time,
   * and triggers external notifications (email/WhatsApp) if configured.
   */
  static async sendNotification(params: CreateNotificationParams): Promise<any> {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: params.userId,
          title: params.title,
          message: params.message,
          type: params.type,
          referenceId: params.referenceId,
          isRead: false,
        },
      });

      // 1. Emit live WebSocket event
      emitUserNotification(params.userId, notification);

      // 2. Dispatch simulated/configured email notification asynchronously
      this.dispatchEmailStub(params).catch((err) =>
        console.warn(`[NOTIFY] Simulated email skipped: ${err.message}`)
      );

      return notification;
    } catch (error: any) {
      console.error('[NOTIFY] Failed to create notification:', error.message);
      return null;
    }
  }

  private static async dispatchEmailStub(params: CreateNotificationParams): Promise<void> {
    // In production, integrate SendGrid, Resend, or AWS SES.
    // For local development, log the simulated dispatch.
    console.log(
      `[EMAIL DISPATCH] To: User(${params.userId}) | Subject: ${params.title} | Content: ${params.message}`
    );
  }

  static async getNotificationsForUser(userId: string, limit = 20): Promise<any[]> {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  static async markAsRead(notificationId: string, userId: string): Promise<any> {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  static async markAllAsRead(userId: string): Promise<any> {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
