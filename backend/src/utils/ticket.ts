import prisma from '../prisma';

/**
 * Generates an immutable, human-friendly ticket reference like CF-2026-000042.
 */
export async function generateTicketNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `CF-${currentYear}-`;

  // Count reports created this calendar year
  const startOfYear = new Date(currentYear, 0, 1);
  const count = await prisma.report.count({
    where: {
      createdAt: {
        gte: startOfYear,
      },
    },
  });

  const nextSequence = count + 1;
  const formattedSeq = String(nextSequence).padStart(6, '0');
  let candidate = `${prefix}${formattedSeq}`;

  // Verify uniqueness (collision prevention)
  const existing = await prisma.report.findUnique({
    where: { ticketNumber: candidate },
  });

  if (existing) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    candidate = `${prefix}${formattedSeq}-${randomSuffix}`;
  }

  return candidate;
}
