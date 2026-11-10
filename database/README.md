# CivicFix Database Module

This directory contains the database design and migration references for CivicFix.

## Schema Architecture
The database schema is defined in Prisma ORM:
- **PostgreSQL Configuration**: `backend/prisma/schema.prisma`
- **SQLite Local Fallback**: `backend/prisma/schema.sqlite.prisma`
- **Seed Data Generator**: `backend/prisma/seed.ts`

## Key Relations
- `User` (1) <---> (1) `UserProfile`
- `Department` (1) <---> (N) `User`
- `User` (Citizen) (1) <---> (N) `Report`
- `Report` (1) <---> (N) `ReportImage`
- `Report` (1) <---> (1) `AIAnalysis`
- `Report` (1) <---> (N) `ReportStatusHistory` (Immutable Audit Trail)
- `Report` (1) <---> (N) `ReportComment`
- `Report` (Canonical) (1) <---> (N) `Report` (Duplicates)
- `Report` (1) <---> (N) `DuplicateMatch`
