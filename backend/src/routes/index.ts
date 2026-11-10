import { Router } from 'express';
import authRoutes from './auth.routes';
import reportRoutes from './report.routes';
import adminRoutes from './admin.routes';
import aiRoutes from './ai.routes';
import notificationRoutes from './notification.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/reports', reportRoutes);
router.use('/admin', adminRoutes);
router.use('/ai', aiRoutes);
router.use('/notifications', notificationRoutes);

export default router;
