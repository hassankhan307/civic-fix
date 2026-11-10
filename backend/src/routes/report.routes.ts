import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authenticateJWT, optionalAuth } from '../middlewares/auth';
import { upload } from '../middlewares/upload';
import { validate } from '../middlewares/validate';
import { z } from 'zod';

const router = Router();

const createReportSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    category: z.string().min(1, 'Category is required'),
    severity: z.string().optional(),
    latitude: z.union([z.string(), z.number()]),
    longitude: z.union([z.string(), z.number()]),
    address: z.string().optional(),
    landmark: z.string().optional(),
    imageUrls: z.any().optional(),
    aiAnalysis: z.any().optional(),
  }),
});

router.post(
  '/',
  authenticateJWT,
  upload.array('images', 5),
  validate(createReportSchema),
  ReportController.createReport
);

router.get('/', optionalAuth, ReportController.getReports);
router.get('/:id', optionalAuth, ReportController.getReportById);

router.post('/:id/comments', authenticateJWT, ReportController.addComment);
router.post('/:id/confirm-resolution', authenticateJWT, ReportController.confirmResolution);

export default router;
