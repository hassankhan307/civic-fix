import prisma from '../prisma';
import { calculateDistanceMeters, calculateBoundingBox, calculateTextSimilarity } from '../utils/geo';
import { NotificationService } from './notification.service';
import { emitReportStatusChanged } from './socket.service';

export interface DuplicateCandidate {
  reportId: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  status: string;
  distanceMeters: number;
  similarityScore: number;
  matchReason: string;
  createdAt: Date;
  primaryImage?: string;
}

export class DuplicateService {
  /**
   * Identifies existing active reports in proximity matching category or text.
   */
  static async checkDuplicates(params: {
    latitude: number;
    longitude: number;
    category: string;
    title: string;
    description: string;
    excludeReportId?: string;
    maxRadiusMeters?: number;
  }): Promise<DuplicateCandidate[]> {
    const radius = params.maxRadiusMeters || 300; // 300 meters default
    const bbox = calculateBoundingBox(params.latitude, params.longitude, radius);

    // Find nearby unresolved or recent reports
    const candidates = await prisma.report.findMany({
      where: {
        id: params.excludeReportId ? { not: params.excludeReportId } : undefined,
        status: { in: ['REPORTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS'] },
        latitude: { gte: bbox.minLat, lte: bbox.maxLat },
        longitude: { gte: bbox.minLon, lte: bbox.maxLon },
      },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
      },
      take: 20,
    });

    const matches: DuplicateCandidate[] = [];

    for (const item of candidates) {
      const distance = calculateDistanceMeters(
        params.latitude,
        params.longitude,
        item.latitude,
        item.longitude
      );

      if (distance > radius) continue;

      const sameCategory = item.category.toLowerCase() === params.category.toLowerCase();
      const titleSim = calculateTextSimilarity(params.title, item.title);
      const descSim = calculateTextSimilarity(params.description, item.description);
      const textSim = Math.max(titleSim, descSim);

      // Distance score (1.0 at 0m, 0.0 at radius)
      const distanceScore = Math.max(0, (radius - distance) / radius);

      // Weighted similarity score:
      // Category match: 40%
      // Geographic closeness: 35%
      // Text similarity: 25%
      let overallSim = (sameCategory ? 0.4 : 0.0) + distanceScore * 0.35 + textSim * 0.25;
      overallSim = Math.min(1.0, Math.round(overallSim * 100) / 100);

      // Consider match if score >= 0.45 or distance < 50m with same category
      if (overallSim >= 0.45 || (sameCategory && distance < 50)) {
        let reason = [];
        if (sameCategory) reason.push('Identical issue category');
        if (distance < 50) reason.push(`Extremely close (${distance}m away)`);
        else reason.push(`Within neighborhood proximity (${distance}m away)`);
        if (textSim > 0.3) reason.push('Similar problem description');

        matches.push({
          reportId: item.id,
          ticketNumber: item.ticketNumber,
          title: item.title,
          description: item.description,
          category: item.category,
          status: item.status,
          distanceMeters: distance,
          similarityScore: overallSim,
          matchReason: reason.join('; '),
          createdAt: item.createdAt,
          primaryImage: item.images[0]?.url,
        });
      }
    }

    // Sort by highest similarity
    matches.sort((a, b) => b.similarityScore - a.similarityScore);
    return matches;
  }

  /**
   * Merges one or more duplicate reports into a canonical report.
   */
  static async mergeReports(
    canonicalReportId: string,
    duplicateReportIds: string[],
    adminUserId: string,
    reason: string
  ): Promise<any> {
    return prisma.$transaction(async (tx) => {
      const canonical = await tx.report.findUnique({
        where: { id: canonicalReportId },
        include: { duplicates: true },
      });

      if (!canonical) {
        throw { statusCode: 404, code: 'NOT_FOUND', message: 'Canonical report not found' };
      }

      // 1. Mark reports as DUPLICATE and link to canonical
      for (const dupId of duplicateReportIds) {
        if (dupId === canonicalReportId) continue;

        const original = await tx.report.findUnique({ where: { id: dupId } });
        if (!original) continue;

        await tx.report.update({
          where: { id: dupId },
          data: {
            status: 'DUPLICATE',
            duplicateOfId: canonicalReportId,
          },
        });

        // Audit status history
        await tx.reportStatusHistory.create({
          data: {
            reportId: dupId,
            fromStatus: original.status,
            toStatus: 'DUPLICATE',
            changedById: adminUserId,
            comment: `Merged into canonical ticket ${canonical.ticketNumber}. Reason: ${reason}`,
          },
        });

        // Notify citizen of the duplicate report
        await NotificationService.sendNotification({
          userId: original.citizenId,
          title: `Report Merged with ${canonical.ticketNumber}`,
          message: `Your report has been linked to existing ticket ${canonical.ticketNumber}. You will receive resolution updates on the main ticket.`,
          type: 'DUPLICATE_ALERT',
          referenceId: canonical.id,
        });

        emitReportStatusChanged({ ...original, status: 'DUPLICATE' }, {
          fromStatus: original.status,
          toStatus: 'DUPLICATE',
          comment: `Merged into ${canonical.ticketNumber}`,
        });
      }

      // 2. Recalculate canonical priority score with elevated corroborating count!
      const allDuplicatesCount = await tx.report.count({
        where: { duplicateOfId: canonicalReportId },
      });

      const updatedPriorityScore = Math.min(100, Math.round(canonical.priorityScore + allDuplicatesCount * 6));
      let newLevel = canonical.priorityLevel;
      if (updatedPriorityScore >= 75) newLevel = 'CRITICAL';
      else if (updatedPriorityScore >= 50) newLevel = 'HIGH';

      const updatedCanonical = await tx.report.update({
        where: { id: canonicalReportId },
        data: {
          priorityScore: updatedPriorityScore,
          priorityLevel: newLevel,
        },
      });

      // Audit log for merge
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'MERGE_DUPLICATES',
          entity: 'Report',
          entityId: canonicalReportId,
          details: JSON.stringify({
            canonicalTicket: canonical.ticketNumber,
            mergedReportIds: duplicateReportIds,
            reason,
            newPriorityScore: updatedPriorityScore,
          }),
        },
      });

      return updatedCanonical;
    });
  }
}
