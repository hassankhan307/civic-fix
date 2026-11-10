import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticateJWT, requireRole } from '../middlewares/auth';

const router = Router();

// Staff & Admin accessible routes
router.use(authenticateJWT);
router.use(requireRole(['ADMIN', 'FIELD_STAFF']));

router.get('/dashboard', AdminController.getDashboard);
router.get('/reports', AdminController.getReports);
router.patch('/reports/:id/status', AdminController.updateStatus);
router.get('/map', AdminController.getMapReports);
router.get('/heatmap', AdminController.getHeatmap);
router.get('/departments', AdminController.getDepartments);
router.get('/staff', AdminController.getStaff);

// Admin-only exclusive routes
router.patch('/reports/:id/priority', requireRole(['ADMIN']), AdminController.updatePriority);
router.post('/reports/:id/assign', requireRole(['ADMIN']), AdminController.assignReport);
router.post('/reports/:id/merge', requireRole(['ADMIN']), AdminController.mergeDuplicates);
router.get('/analytics', requireRole(['ADMIN']), AdminController.getAnalytics);
router.get('/export/csv', requireRole(['ADMIN']), AdminController.exportCSV);

export default router;
