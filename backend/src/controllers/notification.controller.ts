import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { NotificationService } from '../services/notification.service';

export class NotificationController {
  static async getNotifications(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) return;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
      const notifications = await NotificationService.getNotificationsForUser(req.user.id, limit);

      res.json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) return;
      const { id } = req.params;
      await NotificationService.markAsRead(id, req.user.id);

      res.json({
        success: true,
        message: 'Notification marked as read',
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) return;
      await NotificationService.markAllAsRead(req.user.id);

      res.json({
        success: true,
        message: 'All notifications marked as read',
      });
    } catch (error) {
      next(error);
    }
  }
}
