import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, ReportStatus } from '../types';
import { AnalyticsService } from '../services/analytics.service';
import { ReportService } from '../services/report.service';
import { DuplicateService } from '../services/duplicate.service';
import prisma from '../prisma';

export class AdminController {
  static async getDashboard(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AnalyticsService.getDashboardOverview();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getReports(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;

      const result = await ReportService.getReports({
        page,
        limit,
        status: req.query.status as string,
        category: req.query.category as string,
        severity: req.query.severity as string,
        priorityLevel: req.query.priorityLevel as string,
        departmentId: req.query.departmentId as string,
        search: req.query.search as string,
        isPublicView: false,
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

  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) return;
      const { id } = req.params;
      const { status, comment, rejectionReason, resolutionNotes, resolutionPhotoUrl } = req.body;

      const updated = await ReportService.updateReportStatus({
        reportId: id,
        toStatus: status as ReportStatus,
        changedById: req.user.id,
        changedByRole: req.user.role,
        comment,
        rejectionReason,
        resolutionNotes,
        resolutionPhotoUrl,
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async updatePriority(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { priorityScore, priorityLevel, reason } = req.body;

      const report = await prisma.report.update({
        where: { id },
        data: {
          priorityScore: parseFloat(priorityScore),
          priorityLevel: priorityLevel || (priorityScore >= 75 ? 'CRITICAL' : priorityScore >= 50 ? 'HIGH' : priorityScore >= 25 ? 'MEDIUM' : 'LOW'),
        },
      });

      if (req.user) {
        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'UPDATE_PRIORITY',
            entity: 'Report',
            entityId: id,
            details: JSON.stringify({ priorityScore, priorityLevel, reason }),
          },
        });
      }

      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  static async assignReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) return;
      const { id } = req.params;
      const { departmentId, staffId, reason } = req.body;

      const updated = await ReportService.assignReport({
        reportId: id,
        departmentId,
        staffId,
        assignedById: req.user.id,
        reason,
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async mergeDuplicates(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) return;
      const { id } = req.params; // canonical ID
      const { duplicateReportIds, reason } = req.body;

      if (!Array.isArray(duplicateReportIds) || duplicateReportIds.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'duplicateReportIds array is required' },
        });
        return;
      }

      const merged = await DuplicateService.mergeReports(
        id,
        duplicateReportIds,
        req.user.id,
        reason || 'Merged duplicate municipal reports'
      );

      res.json({ success: true, data: merged });
    } catch (error) {
      next(error);
    }
  }

  static async getAnalytics(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AnalyticsService.getAnalyticsData();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async exportCSV(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const csvData = await AnalyticsService.exportReportsCSV();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="civicfix-reports-export.csv"');
      res.send(csvData);
    } catch (error) {
      next(error);
    }
  }

  static async getMapReports(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reports = await prisma.report.findMany({
        where: {
          status: req.query.status ? (req.query.status as string) : undefined,
          category: req.query.category ? (req.query.category as string) : undefined,
          severity: req.query.severity ? (req.query.severity as string) : undefined,
        },
        select: {
          id: true,
          ticketNumber: true,
          title: true,
          description: true,
          category: true,
          severity: true,
          priorityScore: true,
          priorityLevel: true,
          latitude: true,
          longitude: true,
          address: true,
          status: true,
          createdAt: true,
          images: { where: { isPrimary: true }, take: 1, select: { url: true } },
          assignedDepartment: { select: { name: true } },
          assignedStaff: { select: { name: true } },
        },
      });

      res.json({ success: true, data: reports });
    } catch (error) {
      next(error);
    }
  }

  static async getHeatmap(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const points = await AnalyticsService.getHeatmapPoints();
      res.json({ success: true, data: points });
    } catch (error) {
      next(error);
    }
  }

  static async getDepartments(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const departments = await prisma.department.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { reports: true } } },
      });
      res.json({ success: true, data: departments });
    } catch (error) {
      next(error);
    }
  }

  static async getStaff(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const staff = await prisma.user.findMany({
        where: { role: 'FIELD_STAFF', isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          profile: { include: { department: true } },
          _count: {
            select: { assignedReports: { where: { status: { in: ['ASSIGNED', 'IN_PROGRESS'] } } } },
          },
        },
      });
      res.json({ success: true, data: staff });
    } catch (error) {
      next(error);
    }
  }
}
