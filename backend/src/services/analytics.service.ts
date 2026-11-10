import prisma from '../prisma';

export class AnalyticsService {
  /**
   * Generates administrative overview dashboard metrics from real database records.
   */
  static async getDashboardOverview() {
    const [
      totalReports,
      newReported,
      verified,
      assigned,
      inProgress,
      resolved,
      rejected,
      duplicate,
      criticalCount,
      highCount,
      resolvedReports,
      allReportsWithDept,
    ] = await Promise.all([
      prisma.report.count(),
      prisma.report.count({ where: { status: 'REPORTED' } }),
      prisma.report.count({ where: { status: 'VERIFIED' } }),
      prisma.report.count({ where: { status: 'ASSIGNED' } }),
      prisma.report.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.report.count({ where: { status: 'RESOLVED' } }),
      prisma.report.count({ where: { status: 'REJECTED' } }),
      prisma.report.count({ where: { status: 'DUPLICATE' } }),
      prisma.report.count({ where: { priorityLevel: 'CRITICAL', status: { notIn: ['RESOLVED', 'REJECTED'] } } }),
      prisma.report.count({ where: { priorityLevel: 'HIGH', status: { notIn: ['RESOLVED', 'REJECTED'] } } }),
      prisma.report.findMany({
        where: { status: 'RESOLVED', resolutionDate: { not: null } },
        select: { createdAt: true, resolutionDate: true },
      }),
      prisma.report.findMany({
        where: { assignedDepartmentId: { not: null } },
        include: { assignedDepartment: true },
      }),
    ]);

    // Average resolution time in hours
    let avgResolutionHours = 0;
    if (resolvedReports.length > 0) {
      const totalHours = resolvedReports.reduce((acc, r) => {
        const start = new Date(r.createdAt).getTime();
        const end = new Date(r.resolutionDate!).getTime();
        return acc + Math.max(0, (end - start) / (1000 * 60 * 60));
      }, 0);
      avgResolutionHours = Math.round((totalHours / resolvedReports.length) * 10) / 10;
    }

    // Resolution rate percentage
    const actionableReports = totalReports - rejected - duplicate;
    const resolutionRate =
      actionableReports > 0 ? Math.round((resolved / actionableReports) * 100) : 0;

    // Check SLA breaches (unresolved reports older than 48 hours)
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const slaBreaches = await prisma.report.count({
      where: {
        status: { in: ['REPORTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS'] },
        createdAt: { lte: fortyEightHoursAgo },
      },
    });

    return {
      totalReports,
      newReported,
      awaitingVerification: newReported,
      verified,
      assigned,
      inProgress,
      resolved,
      rejected,
      duplicate,
      highPriority: highCount,
      criticalIssues: criticalCount,
      overdueCount: slaBreaches,
      averageResolutionHours: avgResolutionHours,
      resolutionRate: `${resolutionRate}%`,
    };
  }

  /**
   * Generates datasets for Recharts analytics charts and graphs.
   */
  static async getAnalyticsData() {
    const reports = await prisma.report.findMany({
      include: {
        assignedDepartment: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // 1. Category Breakdown
    const categoryMap: Record<string, number> = {};
    const severityMap: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    const statusMap: Record<string, number> = {};
    const departmentMap: Record<string, number> = {};
    const timelineMap: Record<string, { date: string; submitted: number; resolved: number }> = {};

    reports.forEach((r) => {
      // Category
      categoryMap[r.category] = (categoryMap[r.category] || 0) + 1;

      // Severity
      severityMap[r.severity] = (severityMap[r.severity] || 0) + 1;

      // Status
      statusMap[r.status] = (statusMap[r.status] || 0) + 1;

      // Department
      const deptName = r.assignedDepartment?.name || 'Unassigned';
      departmentMap[deptName] = (departmentMap[deptName] || 0) + 1;

      // Timeline (group by YYYY-MM-DD)
      const subDate = new Date(r.createdAt).toISOString().split('T')[0];
      if (!timelineMap[subDate]) {
        timelineMap[subDate] = { date: subDate, submitted: 0, resolved: 0 };
      }
      timelineMap[subDate].submitted += 1;

      if (r.resolutionDate) {
        const resDate = new Date(r.resolutionDate).toISOString().split('T')[0];
        if (!timelineMap[resDate]) {
          timelineMap[resDate] = { date: resDate, submitted: 0, resolved: 0 };
        }
        timelineMap[resDate].resolved += 1;
      }
    });

    const categoryData = Object.keys(categoryMap).map((cat) => ({
      name: cat.replace(/_/g, ' '),
      count: categoryMap[cat],
    }));

    const severityData = Object.keys(severityMap).map((sev) => ({
      name: sev,
      count: severityMap[sev],
    }));

    const statusData = Object.keys(statusMap).map((st) => ({
      name: st.replace(/_/g, ' '),
      count: statusMap[st],
    }));

    const departmentData = Object.keys(departmentMap).map((d) => ({
      name: d,
      count: departmentMap[d],
    }));

    const timelineData = Object.values(timelineMap).sort((a, b) => a.date.localeCompare(b.date));

    // SLA compliance
    const resolvedCount = reports.filter((r) => r.status === 'RESOLVED').length;
    const resolvedOnTimeCount = reports.filter((r) => {
      if (r.status !== 'RESOLVED' || !r.resolutionDate) return false;
      const hours = (new Date(r.resolutionDate).getTime() - new Date(r.createdAt).getTime()) / (1000 * 3600);
      const sla = r.assignedDepartment?.slaHours || 48;
      return hours <= sla;
    }).length;

    const slaComplianceRate =
      resolvedCount > 0 ? Math.round((resolvedOnTimeCount / resolvedCount) * 100) : 100;

    return {
      categoryData,
      severityData,
      statusData,
      departmentData,
      timelineData,
      slaComplianceRate,
      totalAnalyzed: reports.length,
    };
  }

  /**
   * Generates CSV format string for report export.
   */
  static async exportReportsCSV(): Promise<string> {
    const reports = await prisma.report.findMany({
      include: {
        citizen: { select: { name: true, email: true } },
        assignedDepartment: { select: { name: true } },
        assignedStaff: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Ticket Number',
      'Title',
      'Category',
      'Severity',
      'Priority Score',
      'Priority Level',
      'Status',
      'Latitude',
      'Longitude',
      'Address',
      'Department',
      'Assigned Staff',
      'Created Date',
      'Resolved Date',
    ];

    const escapeCSV = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = reports.map((r) => [
      escapeCSV(r.ticketNumber),
      escapeCSV(r.title),
      escapeCSV(r.category),
      escapeCSV(r.severity),
      escapeCSV(r.priorityScore),
      escapeCSV(r.priorityLevel),
      escapeCSV(r.status),
      escapeCSV(r.latitude),
      escapeCSV(r.longitude),
      escapeCSV(r.address),
      escapeCSV(r.assignedDepartment?.name),
      escapeCSV(r.assignedStaff?.name),
      escapeCSV(r.createdAt.toISOString()),
      escapeCSV(r.resolutionDate ? r.resolutionDate.toISOString() : ''),
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  /**
   * Returns geographic coordinates and density intensity for map heatmap.
   */
  static async getHeatmapPoints() {
    const reports = await prisma.report.findMany({
      where: {
        status: { in: ['REPORTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        priorityScore: true,
        category: true,
        severity: true,
      },
    });

    return reports.map((r) => ({
      id: r.id,
      lat: r.latitude,
      lng: r.longitude,
      // Normalize weight between 0.2 and 1.0 based on priority score
      weight: Math.max(0.2, Math.min(1.0, r.priorityScore / 100)),
      category: r.category,
      severity: r.severity,
    }));
  }
}
