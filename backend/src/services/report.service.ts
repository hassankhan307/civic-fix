import prisma from '../prisma';
import { generateTicketNumber } from '../utils/ticket';
import { AIService } from './ai.service';
import { DuplicateService } from './duplicate.service';
import { NotificationService } from './notification.service';
import { emitReportCreated, emitReportStatusChanged, emitReportAssigned } from './socket.service';
import { ReportStatus, UserRole } from '../types';

export class ReportService {
  /**
   * Creates a new civic report ticket.
   */
  static async createReport(params: {
    citizenId: string;
    title: string;
    description: string;
    category: string;
    severity?: string;
    latitude: number;
    longitude: number;
    address?: string;
    landmark?: string;
    imageUrls?: string[];
    aiAnalysis?: any;
  }) {
    const ticketNumber = await generateTicketNumber();
    const severity = params.severity || 'MEDIUM';

    // Calculate priority
    const priority = await AIService.calculatePriority({
      category: params.category,
      severity,
      age_hours: 0,
      corroborating_reports: 0,
      near_critical_infrastructure: false,
    });

    const report = await prisma.$transaction(async (tx) => {
      // 1. Create Report
      const created = await tx.report.create({
        data: {
          ticketNumber,
          citizenId: params.citizenId,
          title: params.title,
          description: params.description,
          category: params.category.toUpperCase(),
          severity: severity.toUpperCase(),
          priorityScore: priority.priority_score,
          priorityLevel: priority.priority_level,
          latitude: params.latitude,
          longitude: params.longitude,
          address: params.address,
          landmark: params.landmark,
          status: 'REPORTED',
          images: params.imageUrls?.length
            ? {
                create: params.imageUrls.map((url, idx) => ({
                  url,
                  isPrimary: idx === 0,
                })),
              }
            : undefined,
          aiAnalysis: params.aiAnalysis
            ? {
                create: {
                  detectedCategory: params.aiAnalysis.category || params.category,
                  estimatedSeverity: params.aiAnalysis.severity || severity,
                  confidence: params.aiAnalysis.confidence || 0.8,
                  generatedDescription: params.aiAnalysis.description || params.description,
                  recommendedAction: params.aiAnalysis.recommended_action || 'Inspect on-site',
                  priorityScore: params.aiAnalysis.priority_score || priority.priority_score,
                  needsHumanReview: Boolean(params.aiAnalysis.needs_human_review),
                  modelVersion: params.aiAnalysis.model_version || '1.0.0',
                  rawResponse: JSON.stringify(params.aiAnalysis),
                },
              }
            : undefined,
          statusHistory: {
            create: {
              fromStatus: 'NONE',
              toStatus: 'REPORTED',
              changedById: params.citizenId,
              comment: 'Report submitted by citizen',
            },
          },
        },
        include: {
          images: true,
          aiAnalysis: true,
          citizen: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return created;
    });

    // 2. Perform background duplicate checking & indexing
    DuplicateService.checkDuplicates({
      latitude: report.latitude,
      longitude: report.longitude,
      category: report.category,
      title: report.title,
      description: report.description,
      excludeReportId: report.id,
    })
      .then(async (matches) => {
        for (const match of matches) {
          await prisma.duplicateMatch.create({
            data: {
              reportId: report.id,
              targetReportId: match.reportId,
              similarityScore: match.similarityScore,
              distanceMeters: match.distanceMeters,
              matchReason: match.matchReason,
              status: 'PENDING',
            },
          });
        }
      })
      .catch((err) => console.warn('[DUPLICATE CHECK] Background check error:', err));

    // 3. Emit real-time creation event
    emitReportCreated(report);

    // 4. Send citizen confirmation notification
    await NotificationService.sendNotification({
      userId: params.citizenId,
      title: 'Report Ticket Created',
      message: `Your report has been received under ticket number ${ticketNumber}. Our team will review it shortly.`,
      type: 'STATUS_CHANGE',
      referenceId: report.id,
    });

    return report;
  }

  /**
   * Fetches paginated reports with flexible filters.
   */
  static async getReports(params: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    severity?: string;
    priorityLevel?: string;
    departmentId?: string;
    search?: string;
    citizenId?: string;
    assignedStaffId?: string;
    isPublicView?: boolean;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.status) {
      where.status = params.status;
    } else if (params.isPublicView) {
      // In public view, exclude duplicates and rejected by default
      where.status = { notIn: ['REJECTED', 'DUPLICATE'] };
    }

    if (params.category) where.category = params.category.toUpperCase();
    if (params.severity) where.severity = params.severity.toUpperCase();
    if (params.priorityLevel) where.priorityLevel = params.priorityLevel.toUpperCase();
    if (params.departmentId) where.assignedDepartmentId = params.departmentId;
    if (params.citizenId) where.citizenId = params.citizenId;
    if (params.assignedStaffId) where.assignedStaffId = params.assignedStaffId;

    if (params.search) {
      where.OR = [
        { ticketNumber: { contains: params.search } },
        { title: { contains: params.search } },
        { description: { contains: params.search } },
        { address: { contains: params.search } },
      ];
    }

    const [total, reports] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priorityScore: 'desc' }, { createdAt: 'desc' }],
        include: {
          images: true,
          citizen: {
            select: {
              id: true,
              name: true,
              // In public view, do not expose sensitive citizen contact
              email: params.isPublicView ? false : true,
            },
          },
          assignedDepartment: true,
          assignedStaff: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { comments: true, duplicates: true },
          },
        },
      }),
    ]);

    return {
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves full report details including audit trail, comments, and matches.
   */
  static async getReportById(id: string, user?: { id: string; role: UserRole }) {
    const report = await prisma.report.findFirst({
      where: {
        OR: [{ id }, { ticketNumber: id }],
      },
      include: {
        images: true,
        aiAnalysis: true,
        citizen: {
          select: { id: true, name: true, email: true, phone: true },
        },
        assignedDepartment: true,
        assignedStaff: {
          select: { id: true, name: true, email: true },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: {
            changedBy: { select: { id: true, name: true, role: true } },
          },
        },
        assignmentHistory: {
          orderBy: { createdAt: 'desc' },
          include: {
            changedBy: { select: { id: true, name: true, role: true } },
          },
        },
        comments: {
          where: user?.role === 'CITIZEN' ? { isInternal: false } : undefined,
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, name: true, role: true } },
          },
        },
        duplicates: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            status: true,
            createdAt: true,
          },
        },
        duplicateOf: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            status: true,
          },
        },
        duplicateMatches: {
          include: {
            targetReport: {
              select: {
                id: true,
                ticketNumber: true,
                title: true,
                category: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!report) {
      throw { statusCode: 404, code: 'REPORT_NOT_FOUND', message: 'Report ticket not found' };
    }

    // Redact sensitive citizen contact info if viewed by another citizen
    if (user && user.role === 'CITIZEN' && user.id !== report.citizenId) {
      report.citizen.phone = null;
      report.citizen.email = '';
    }

    return report;
  }

  /**
   * Updates report status with workflow validation and immutable audit history.
   */
  static async updateReportStatus(params: {
    reportId: string;
    toStatus: ReportStatus;
    changedById: string;
    changedByRole: UserRole;
    comment?: string;
    rejectionReason?: string;
    resolutionNotes?: string;
    resolutionPhotoUrl?: string;
  }) {
    const report = await prisma.report.findUnique({
      where: { id: params.reportId },
    });

    if (!report) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Report not found' };
    }

    const currentStatus = report.status as ReportStatus;
    const toStatus = params.toStatus;

    // Validate permitted transitions
    const allowedTransitions: Record<ReportStatus, ReportStatus[]> = {
      REPORTED: ['VERIFIED', 'REJECTED', 'DUPLICATE'],
      VERIFIED: ['ASSIGNED', 'IN_PROGRESS', 'REJECTED', 'DUPLICATE'],
      ASSIGNED: ['IN_PROGRESS', 'RESOLVED', 'REJECTED'],
      IN_PROGRESS: ['RESOLVED', 'REJECTED'],
      RESOLVED: ['IN_PROGRESS'], // Reopened if citizen contests resolution
      REJECTED: ['REPORTED'],
      DUPLICATE: ['REPORTED'],
    };

    if (
      currentStatus !== toStatus &&
      !allowedTransitions[currentStatus]?.includes(toStatus)
    ) {
      throw {
        statusCode: 400,
        code: 'INVALID_STATUS_TRANSITION',
        message: `Status transition from ${currentStatus} to ${toStatus} is not permitted.`,
      };
    }

    // Field staff can only transition to IN_PROGRESS or RESOLVED
    if (params.changedByRole === 'FIELD_STAFF') {
      if (!['IN_PROGRESS', 'RESOLVED'].includes(toStatus)) {
        throw {
          statusCode: 403,
          code: 'FORBIDDEN',
          message: 'Field staff can only mark reports as IN_PROGRESS or RESOLVED.',
        };
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updateData: any = {
        status: toStatus,
      };

      if (toStatus === 'VERIFIED') {
        updateData.verifiedAt = new Date();
        updateData.verifiedById = params.changedById;
      }

      if (toStatus === 'REJECTED') {
        updateData.rejectionReason = params.rejectionReason || params.comment || 'Rejected by administrator';
      }

      if (toStatus === 'RESOLVED') {
        updateData.resolutionDate = new Date();
        if (params.resolutionNotes) updateData.resolutionNotes = params.resolutionNotes;
        if (params.resolutionPhotoUrl) {
          updateData.resolutionPhotoUrl = params.resolutionPhotoUrl;
          await tx.reportImage.create({
            data: {
              reportId: report.id,
              url: params.resolutionPhotoUrl,
              isPrimary: false,
              isResolutionEvidence: true,
            },
          });
        }
      }

      const updatedReport = await tx.report.update({
        where: { id: report.id },
        data: updateData,
        include: { citizen: true, assignedStaff: true, assignedDepartment: true },
      });

      // Record immutable status transition
      const historyItem = await tx.reportStatusHistory.create({
        data: {
          reportId: report.id,
          fromStatus: currentStatus,
          toStatus,
          changedById: params.changedById,
          comment: params.comment || `Status updated from ${currentStatus} to ${toStatus}`,
        },
      });

      return { updatedReport, historyItem };
    });

    // Notify citizen
    await NotificationService.sendNotification({
      userId: report.citizenId,
      title: `Status Update: ${report.ticketNumber}`,
      message: `Your report status has changed to "${toStatus}". ${params.comment || ''}`,
      type: 'STATUS_CHANGE',
      referenceId: report.id,
    });

    // Real-time broadcast
    emitReportStatusChanged(updated.updatedReport, updated.historyItem);

    return updated.updatedReport;
  }

  /**
   * Assigns report to a department and/or field staff member.
   */
  static async assignReport(params: {
    reportId: string;
    departmentId?: string;
    staffId?: string;
    assignedById: string;
    reason?: string;
  }) {
    const report = await prisma.report.findUnique({
      where: { id: params.reportId },
    });

    if (!report) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Report not found' };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextStatus = report.status === 'REPORTED' || report.status === 'VERIFIED' ? 'ASSIGNED' : report.status;

      const updatedReport = await tx.report.update({
        where: { id: report.id },
        data: {
          assignedDepartmentId: params.departmentId || report.assignedDepartmentId,
          assignedStaffId: params.staffId || report.assignedStaffId,
          status: nextStatus,
        },
        include: { assignedDepartment: true, assignedStaff: true, citizen: true },
      });

      await tx.reportAssignmentHistory.create({
        data: {
          reportId: report.id,
          previousDeptId: report.assignedDepartmentId,
          newDeptId: params.departmentId || report.assignedDepartmentId,
          previousStaffId: report.assignedStaffId,
          newStaffId: params.staffId || report.assignedStaffId,
          changedById: params.assignedById,
          reason: params.reason || 'Assigned by administrator',
        },
      });

      if (nextStatus !== report.status) {
        await tx.reportStatusHistory.create({
          data: {
            reportId: report.id,
            fromStatus: report.status,
            toStatus: nextStatus,
            changedById: params.assignedById,
            comment: `Assigned to department/staff`,
          },
        });
      }

      return updatedReport;
    });

    // Notify assigned staff
    if (params.staffId) {
      await NotificationService.sendNotification({
        userId: params.staffId,
        title: `New Assignment: ${report.ticketNumber}`,
        message: `You have been assigned to handle issue ${report.ticketNumber}: "${report.title}".`,
        type: 'ASSIGNMENT',
        referenceId: report.id,
      });
    }

    emitReportAssigned(updated);

    return updated;
  }

  /**
   * Adds a discussion comment or internal note.
   */
  static async addComment(params: {
    reportId: string;
    authorId: string;
    content: string;
    isInternal?: boolean;
  }) {
    const comment = await prisma.reportComment.create({
      data: {
        reportId: params.reportId,
        authorId: params.authorId,
        content: params.content,
        isInternal: Boolean(params.isInternal),
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    return comment;
  }

  /**
   * Citizen confirms whether the reported problem was properly resolved.
   */
  static async confirmResolution(params: {
    reportId: string;
    citizenId: string;
    confirmed: boolean;
    confirmationNotes?: string;
  }) {
    const report = await prisma.report.findUnique({
      where: { id: params.reportId },
    });

    if (!report || report.citizenId !== params.citizenId) {
      throw { statusCode: 403, code: 'UNAUTHORIZED', message: 'Only the reporting citizen can confirm resolution' };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedReport = await tx.report.update({
        where: { id: report.id },
        data: {
          confirmedByCitizen: params.confirmed,
          confirmedAt: new Date(),
          confirmationNotes: params.confirmationNotes,
          // If citizen states problem is NOT resolved, reopen status to IN_PROGRESS
          status: params.confirmed ? report.status : 'IN_PROGRESS',
        },
      });

      await tx.reportStatusHistory.create({
        data: {
          reportId: report.id,
          fromStatus: report.status,
          toStatus: params.confirmed ? report.status : 'IN_PROGRESS',
          changedById: params.citizenId,
          comment: params.confirmed
            ? `Citizen confirmed resolution: ${params.confirmationNotes || 'Verified'}`
            : `Citizen reported unresolved issue: ${params.confirmationNotes || 'Problem persists'}`,
        },
      });

      return updatedReport;
    });

    return updated;
  }
}
