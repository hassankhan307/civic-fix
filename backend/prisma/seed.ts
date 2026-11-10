import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding CivicFix database with initial records...');

  // 1. Seed Departments
  const departmentsData = [
    { name: 'Public Works & Infrastructure', code: 'PW', description: 'Road resurfacing, bridges, sidewalks, structural municipal works', contactEmail: 'pw@civicfix.org', slaHours: 48 },
    { name: 'Sanitation & Solid Waste', code: 'SW', description: 'Refuse collection, illegal dumping removal, recycling, and street cleaning', contactEmail: 'sanitation@civicfix.org', slaHours: 24 },
    { name: 'Electrical & Street Lighting', code: 'EL', description: 'Power grid issues, streetlight repairs, exposed wiring, signals', contactEmail: 'electrical@civicfix.org', slaHours: 24 },
    { name: 'Water & Sewage Utility', code: 'WS', description: 'Water main breaks, sewer blockages, hydrants, pressure leaks', contactEmail: 'water@civicfix.org', slaHours: 12 },
    { name: 'Forestry & Urban Parks', code: 'FP', description: 'Fallen trees, dangerous branches, park maintenance, arboriculture', contactEmail: 'forestry@civicfix.org', slaHours: 36 },
    { name: 'Traffic Management & Signals', code: 'TR', description: 'Traffic signals, pedestrian crossings, speed humps, signage', contactEmail: 'traffic@civicfix.org', slaHours: 24 },
  ];

  const depts: Record<string, any> = {};
  for (const d of departmentsData) {
    depts[d.code] = await prisma.department.upsert({
      where: { code: d.code },
      update: {},
      create: d,
    });
  }

  // 2. Seed Users
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const staffPassword = await bcrypt.hash('Worker123!', 10);
  const citizenPassword = await bcrypt.hash('Citizen123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@civicfix.org' },
    update: {},
    create: {
      email: 'admin@civicfix.org',
      passwordHash: adminPassword,
      role: 'ADMIN',
      name: 'Chief Administrator Arthur Vance',
      phone: '+1 555-0100',
      profile: {
        create: {
          departmentId: depts.PW.id,
          notificationsEnabled: true,
          emailNotifications: true,
        },
      },
    },
  });

  const workerElectrical = await prisma.user.upsert({
    where: { email: 'worker.electrical@civicfix.org' },
    update: {},
    create: {
      email: 'worker.electrical@civicfix.org',
      passwordHash: staffPassword,
      role: 'FIELD_STAFF',
      name: 'Marcus Vance (Electrical)',
      phone: '+1 555-0101',
      profile: {
        create: {
          departmentId: depts.EL.id,
          notificationsEnabled: true,
          emailNotifications: true,
        },
      },
    },
  });

  const workerRoads = await prisma.user.upsert({
    where: { email: 'worker.roads@civicfix.org' },
    update: {},
    create: {
      email: 'worker.roads@civicfix.org',
      passwordHash: staffPassword,
      role: 'FIELD_STAFF',
      name: 'Elena Rostova (Roads)',
      phone: '+1 555-0102',
      profile: {
        create: {
          departmentId: depts.PW.id,
          notificationsEnabled: true,
          emailNotifications: true,
        },
      },
    },
  });

  const workerWater = await prisma.user.upsert({
    where: { email: 'worker.water@civicfix.org' },
    update: {},
    create: {
      email: 'worker.water@civicfix.org',
      passwordHash: staffPassword,
      role: 'FIELD_STAFF',
      name: 'David Chen (Water Dept)',
      phone: '+1 555-0103',
      profile: {
        create: {
          departmentId: depts.WS.id,
          notificationsEnabled: true,
          emailNotifications: true,
        },
      },
    },
  });

  const citizenSarah = await prisma.user.upsert({
    where: { email: 'citizen@civicfix.org' },
    update: {},
    create: {
      email: 'citizen@civicfix.org',
      passwordHash: citizenPassword,
      role: 'CITIZEN',
      name: 'Sarah Connor',
      phone: '+1 555-0199',
      profile: {
        create: {
          notificationsEnabled: true,
          emailNotifications: true,
        },
      },
    },
  });

  const citizenAlex = await prisma.user.upsert({
    where: { email: 'alex@civicfix.org' },
    update: {},
    create: {
      email: 'alex@civicfix.org',
      passwordHash: citizenPassword,
      role: 'CITIZEN',
      name: 'Alex Rivera',
      phone: '+1 555-0182',
      profile: {
        create: {
          notificationsEnabled: true,
          emailNotifications: true,
        },
      },
    },
  });

  // 3. Seed Reports
  const reportsData = [
    {
      ticketNumber: 'CF-2026-000001',
      citizenId: citizenSarah.id,
      title: 'Exposed high-voltage conduit near playground',
      description: 'Underground wiring box cover has been pried open and live cabling is hanging outward near the children sandbox.',
      category: 'EXPOSED_WIRING',
      severity: 'CRITICAL',
      priorityScore: 92.5,
      priorityLevel: 'CRITICAL',
      latitude: 40.7128,
      longitude: -74.006,
      address: '240 Riverside Blvd, Hudson Park',
      landmark: 'Next to child swings',
      status: 'IN_PROGRESS',
      assignedDepartmentId: depts.EL.id,
      assignedStaffId: workerElectrical.id,
      aiAnalysis: {
        category: 'exposed_wiring',
        severity: 'critical',
        confidence: 0.94,
        description: 'Exposed live cabling and broken junction panel detected in high-density pedestrian zone.',
        recommended_action: 'Immediate dispatch: isolate feeder breaker and install lockable steel enclosure.',
        priority_score: 92.5,
        needs_human_review: true,
      },
    },
    {
      ticketNumber: 'CF-2026-000002',
      citizenId: citizenSarah.id,
      title: 'Large wheel-damaging pothole on eastbound lane',
      description: 'Deep pothole roughly 2 feet wide and 5 inches deep right before intersection. Several vehicles already blew tires.',
      category: 'POTHOLE',
      severity: 'HIGH',
      priorityScore: 78.0,
      priorityLevel: 'HIGH',
      latitude: 40.7185,
      longitude: -74.001,
      address: '450 Grand St, Lower East Side',
      landmark: 'In front of Metro Pharmacy',
      status: 'ASSIGNED',
      assignedDepartmentId: depts.PW.id,
      assignedStaffId: workerRoads.id,
      aiAnalysis: {
        category: 'pothole',
        severity: 'high',
        confidence: 0.91,
        description: 'Large asphalt depression visible near vehicular wheel path.',
        recommended_action: 'Cold-patch asphalt repair and traffic cone placement.',
        priority_score: 78.0,
        needs_human_review: false,
      },
    },
    {
      ticketNumber: 'CF-2026-000003',
      citizenId: citizenAlex.id,
      title: 'Illegal bulk dumping obstructing alleyway',
      description: 'Large pile of discarded mattresses, construction drywall, and broken glass left overnight in the alleyway.',
      category: 'GARBAGE_ACCUMULATION',
      severity: 'MEDIUM',
      priorityScore: 42.0,
      priorityLevel: 'MEDIUM',
      latitude: 40.724,
      longitude: -73.998,
      address: '112 Mercer St, SoHo',
      landmark: 'Behind brick warehouse',
      status: 'REPORTED',
      assignedDepartmentId: depts.SW.id,
      aiAnalysis: {
        category: 'garbage_accumulation',
        severity: 'medium',
        confidence: 0.88,
        description: 'Unregulated solid waste disposal obstructing right of way.',
        recommended_action: 'Schedule flatbed truck cleanup and inspect for code enforcement.',
        priority_score: 42.0,
        needs_human_review: false,
      },
    },
    {
      ticketNumber: 'CF-2026-000004',
      citizenId: citizenAlex.id,
      title: 'Pressurized water main leak flooding curb',
      description: 'Water bubbling up forcefully through road seam and pouring into storm drains. Street starting to buckle.',
      category: 'WATER_LEAKAGE',
      severity: 'CRITICAL',
      priorityScore: 86.0,
      priorityLevel: 'CRITICAL',
      latitude: 40.7305,
      longitude: -74.004,
      address: '77 7th Ave, Greenwich Village',
      landmark: 'Near subway station entrance',
      status: 'VERIFIED',
      assignedDepartmentId: depts.WS.id,
      aiAnalysis: {
        category: 'water_leakage',
        severity: 'critical',
        confidence: 0.93,
        description: 'High-volume subterranean water leak eroding sub-base pavement.',
        recommended_action: 'Dispatch emergency water utility crew to shut gate valve.',
        priority_score: 86.0,
        needs_human_review: true,
      },
    },
    {
      ticketNumber: 'CF-2026-000005',
      citizenId: citizenSarah.id,
      title: 'Flickering street luminaire fixture replaced',
      description: 'Streetlight has been flickering and completely goes dark after 10 PM leaving the crosswalk dark.',
      category: 'BROKEN_STREETLIGHT',
      severity: 'LOW',
      priorityScore: 28.0,
      priorityLevel: 'MEDIUM',
      latitude: 40.715,
      longitude: -74.009,
      address: '15 West St, Battery Park City',
      landmark: 'Opposite ferry terminal',
      status: 'RESOLVED',
      assignedDepartmentId: depts.EL.id,
      assignedStaffId: workerElectrical.id,
      resolutionNotes: 'Replaced ballast and mounted energy-efficient 150W LED cobra head luminaire. Tested active circuit at 120V.',
      resolutionDate: new Date(Date.now() - 3 * 3600 * 1000),
      aiAnalysis: {
        category: 'broken_streetlight',
        severity: 'low',
        confidence: 0.86,
        description: 'Non-functional street light luminaire fixture.',
        recommended_action: 'Replace luminaire lamp head and verify photo-cell.',
        priority_score: 28.0,
        needs_human_review: false,
      },
    },
  ];

  for (const r of reportsData) {
    const existing = await prisma.report.findUnique({ where: { ticketNumber: r.ticketNumber } });
    if (!existing) {
      await prisma.report.create({
        data: {
          ticketNumber: r.ticketNumber,
          citizenId: r.citizenId,
          title: r.title,
          description: r.description,
          category: r.category,
          severity: r.severity,
          priorityScore: r.priorityScore,
          priorityLevel: r.priorityLevel,
          latitude: r.latitude,
          longitude: r.longitude,
          address: r.address,
          landmark: r.landmark,
          status: r.status,
          assignedDepartmentId: r.assignedDepartmentId,
          assignedStaffId: r.assignedStaffId,
          resolutionNotes: r.resolutionNotes,
          resolutionDate: r.resolutionDate,
          aiAnalysis: {
            create: {
              detectedCategory: r.aiAnalysis.category,
              estimatedSeverity: r.aiAnalysis.severity,
              confidence: r.aiAnalysis.confidence,
              generatedDescription: r.aiAnalysis.description,
              recommendedAction: r.aiAnalysis.recommended_action,
              priorityScore: r.aiAnalysis.priority_score,
              needsHumanReview: r.aiAnalysis.needs_human_review,
              modelVersion: 'seed-v1.0',
            },
          },
          statusHistory: {
            create: [
              {
                fromStatus: 'NONE',
                toStatus: 'REPORTED',
                changedById: r.citizenId,
                comment: 'Initial citizen ticket submission',
              },
              ...(r.status !== 'REPORTED'
                ? [
                    {
                      fromStatus: 'REPORTED',
                      toStatus: r.status,
                      changedById: admin.id,
                      comment: `Verified and moved to ${r.status}`,
                    },
                  ]
                : []),
            ],
          },
          comments: {
            create: [
              {
                authorId: admin.id,
                content: 'Municipal triage team has registered this issue.',
                isInternal: false,
              },
            ],
          },
        },
      });
    }
  }

  // 4. Seed Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: citizenSarah.id,
        title: 'Report Update: CF-2026-000001',
        message: 'Your report regarding exposed wiring has been assigned to Marcus Vance and is In Progress.',
        type: 'STATUS_CHANGE',
        isRead: false,
      },
      {
        userId: citizenSarah.id,
        title: 'Issue Resolved: CF-2026-000005',
        message: 'Streetlight maintenance is complete. Please confirm resolution in your portal.',
        type: 'STATUS_CHANGE',
        isRead: true,
      },
    ],
  });

  console.log('Database seeding successfully finished!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
