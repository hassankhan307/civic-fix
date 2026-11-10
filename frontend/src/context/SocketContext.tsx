'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  latestAlert: string | null;
  clearLatestAlert: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [latestAlert, setLatestAlert] = useState<string | null>(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.notifications.getAll(25);
      if (res.data) setNotifications(res.data);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [user]);

  useEffect(() => {
    // Connect to Socket.IO server on backend (port 5000)
    const backendUrl =
      typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}:5000`
        : 'http://localhost:5000';

    const socketInstance = io(backendUrl, {
      auth: { token: token || undefined },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    // Handle new in-app notification
    socketInstance.on('notification:created', (newNotif: NotificationItem) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setLatestAlert(`${newNotif.title}: ${newNotif.message}`);
    });

    // Handle live status change
    socketInstance.on('report:status_changed', (payload: any) => {
      const ticket = payload.report?.ticketNumber || 'Ticket';
      const status = payload.report?.status || 'Updated';
      setLatestAlert(`Update on ${ticket}: Status changed to ${status}`);
    });

    // Handle live report creation
    socketInstance.on('report:created', (report: any) => {
      if (user?.role === 'ADMIN' || user?.role === 'FIELD_STAFF') {
        setLatestAlert(`New Report ${report.ticketNumber}: ${report.title}`);
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token, user]);

  const markAsRead = async (id: string) => {
    try {
      await api.notifications.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        latestAlert,
        clearLatestAlert: () => setLatestAlert(null),
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
