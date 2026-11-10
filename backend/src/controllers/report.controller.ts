import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types';
import { ReportService } from '../services/report.service';

export class ReportController {
  static async createReport(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      // Check uploaded files if using multipart
      let imageUrls: string[] = [];
      if (req.files && Array.isArray(req.files)) {
        imageUrls = (req.files as Express.Multer.File[]).map((f) => `/uploads/${f.filename}`);
      } else if (req.body.imageUrls) {
        imageUrls = Array.isArray(req.body.imageUrls)
          ? req.body.imageUrls
          : [req.body.imageUrls];
      }

      let parsedAiAnalysis = req.body.aiAnalysis;
      if (typeof parsedAiAnalysis === 'string') {
        try {
          parsedAiAnalysis = JSON.parse(parsedAiAnalysis);
        } catch {}
      }

      const report = await ReportService.createReport({
        citizenId: req.user.id,
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        severity: req.body.severity,
        latitude: parseFloat(req.body.latitude),
        longitude: parseFloat(req.body.longitude),
        address: req.body.address,
        landmark: req.body.landmark,
        imageUrls,
        aiAnalysis: parsedAiAnalysis,
      });

      res.status(201).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getReports(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const isPublic = !req.user || req.user.role === 'CITIZEN';

      const result = await ReportService.getReports({
        page,
        limit,
        status: req.query.status as string,
        category: req.query.category as string,
        severity: req.query.severity as string,
        priorityLevel: req.query.priorityLevel as string,
        departmentId: req.query.departmentId as string,
        search: req.query.search as string,
        citizenId: req.query.mine === 'true' && req.user ? req.user.id : undefined,
        assignedStaffId: req.query.assignedStaffId as string,
        isPublicView: isPublic && req.query.mine !== 'true',
      });

      res.json({
        success: true,
        data: result.reports,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getReportById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const report = await ReportService.getReportById(
        id,
        req.user ? { id: req.user.id, role: req.user.role } : undefined
      );

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  static async addComment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const { id } = req.params;
      const { content, isInternal } = req.body;

      // Only staff/admin can make internal comments
      const canMarkInternal = req.user.role === 'ADMIN' || req.user.role === 'FIELD_STAFF';

      const comment = await ReportService.addComment({
        reportId: id,
        authorId: req.user.id,
        content,
        isInternal: canMarkInternal ? Boolean(isInternal) : false,
      });

      res.status(201).json({
        success: true,
        data: comment,
      });
    } catch (error) {
      next(error);
    }
  }

  static async confirmResolution(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const { id } = req.params;
      const { confirmed, confirmationNotes } = req.body;

      const updated = await ReportService.confirmResolution({
        reportId: id,
        citizenId: req.user.id,
        confirmed: Boolean(confirmed),
        confirmationNotes,
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}
