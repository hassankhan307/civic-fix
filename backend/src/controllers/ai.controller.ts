import { Request, Response, NextFunction } from 'express';
import { AIService } from '../services/ai.service';
import { DuplicateService } from '../services/duplicate.service';

export class AIController {
  static async analyzeImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { code: 'FILE_MISSING', message: 'Image file is required for AI analysis' },
        });
        return;
      }

      const result = await AIService.analyzeImage(
        req.file.path,
        req.file.originalname,
        req.file.mimetype
      );

      res.json({
        success: true,
        data: {
          ...result,
          imageUrl: `/uploads/${req.file.filename}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async checkDuplicates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { latitude, longitude, category, title, description, excludeReportId } = req.body;

      if (!latitude || !longitude) {
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Latitude and Longitude are required' },
        });
        return;
      }

      const matches = await DuplicateService.checkDuplicates({
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        category: category || 'other',
        title: title || '',
        description: description || '',
        excludeReportId,
      });

      res.json({
        success: true,
        data: matches,
      });
    } catch (error) {
      next(error);
    }
  }
}
