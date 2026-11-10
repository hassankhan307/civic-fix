import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthUser } from '../types';

let io: SocketIOServer | null = null;

export function initSocketIO(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: [env.CORS_ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PATCH'],
    },
  });

  // Socket authentication middleware
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      // Allow unauthenticated connection to public channels (e.g. public map updates)
      return next();
    }

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUser;
      (socket as any).user = decoded;
      next();
    } catch {
      // Invalid token, continue as guest
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as AuthUser | undefined;

    if (user) {
      // Join personal room for private notifications
      socket.join(`user_${user.id}`);

      // If administrator or field staff, join operational channels
      if (user.role === 'ADMIN') {
        socket.join('admin_feed');
      }
      if (user.role === 'FIELD_STAFF' || user.role === 'ADMIN') {
        socket.join('staff_feed');
      }
    }

    // Join public updates room
    socket.join('public_feed');

    socket.on('subscribe_report', (reportId: string) => {
      socket.join(`report_${reportId}`);
    });

    socket.on('unsubscribe_report', (reportId: string) => {
      socket.leave(`report_${reportId}`);
    });

    socket.on('disconnect', () => {
      // Handled cleanly
    });
  });

  console.log('[SOCKET.IO] WebSocket server initialized');
  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitReportCreated(report: any): void {
  if (!io) return;
  // Notify admins immediately
  io.to('admin_feed').emit('report:created', report);
  // Broadcast sanitized update to public feed
  io.to('public_feed').emit('report:public_created', {
    id: report.id,
    ticketNumber: report.ticketNumber,
    category: report.category,
    severity: report.severity,
    latitude: report.latitude,
    longitude: report.longitude,
    status: report.status,
    createdAt: report.createdAt,
  });
}

export function emitReportStatusChanged(report: any, historyItem: any): void {
  if (!io) return;
  // Notify ticket room
  io.to(`report_${report.id}`).emit('report:status_changed', { report, historyItem });
  // Notify report owner
  if (report.citizenId) {
    io.to(`user_${report.citizenId}`).emit('report:status_changed', { report, historyItem });
  }
  // Notify admins and staff
  io.to('admin_feed').emit('report:status_changed', { report, historyItem });
  io.to('public_feed').emit('report:public_status_changed', {
    id: report.id,
    ticketNumber: report.ticketNumber,
    status: report.status,
  });
}

export function emitReportAssigned(report: any): void {
  if (!io) return;
  io.to(`report_${report.id}`).emit('report:assigned', report);
  if (report.assignedStaffId) {
    io.to(`user_${report.assignedStaffId}`).emit('report:assigned', report);
  }
  io.to('admin_feed').emit('report:assigned', report);
}

export function emitUserNotification(userId: string, notification: any): void {
  if (!io) return;
  io.to(`user_${userId}`).emit('notification:created', notification);
}
