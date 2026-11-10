import { Request } from 'express';

export type UserRole = 'CITIZEN' | 'ADMIN' | 'FIELD_STAFF';

export type ReportStatus =
  | 'REPORTED'
  | 'VERIFIED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED'
  | 'DUPLICATE';

export type CivicCategory =
  | 'POTHOLE'
  | 'BROKEN_STREETLIGHT'
  | 'GARBAGE_ACCUMULATION'
  | 'WATER_LEAKAGE'
  | 'BLOCKED_DRAINAGE'
  | 'DAMAGED_SIDEWALK'
  | 'FALLEN_TREE'
  | 'EXPOSED_WIRING'
  | 'DAMAGED_INFRASTRUCTURE'
  | 'OTHER';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface AIAnalysisResult {
  category: string;
  severity: string;
  confidence: number;
  description: string;
  priority_score: number;
  recommended_action: string;
  needs_human_review: boolean;
  detected_features?: string[];
  provider_used?: string;
  model_version?: string;
}

export interface PriorityBreakdown {
  priority_score: number;
  priority_level: PriorityLevel;
  breakdown: Record<string, number>;
  algorithm_version: string;
}
