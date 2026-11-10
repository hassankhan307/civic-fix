import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString?: string | Date): string {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCategory(cat?: string): string {
  if (!cat) return 'General';
  const map: Record<string, string> = {
    POTHOLE: 'Pothole & Damaged Road',
    BROKEN_STREETLIGHT: 'Broken Streetlight',
    GARBAGE_ACCUMULATION: 'Garbage Accumulation',
    WATER_LEAKAGE: 'Water Leakage',
    BLOCKED_DRAINAGE: 'Blocked Drainage',
    DAMAGED_SIDEWALK: 'Damaged Sidewalk',
    FALLEN_TREE: 'Fallen Tree',
    EXPOSED_WIRING: 'Exposed Electrical Wiring',
    DAMAGED_INFRASTRUCTURE: 'Damaged Infrastructure',
    OTHER: 'Other Municipal Issue',
  };
  return map[cat.toUpperCase()] || cat.replace(/_/g, ' ');
}

export const CATEGORY_COLORS: Record<string, string> = {
  POTHOLE: '#d97706', // amber
  BROKEN_STREETLIGHT: '#ca8a04', // yellow
  GARBAGE_ACCUMULATION: '#65a30d', // lime
  WATER_LEAKAGE: '#0284c7', // sky
  BLOCKED_DRAINAGE: '#0d9488', // teal
  DAMAGED_SIDEWALK: '#9333ea', // purple
  FALLEN_TREE: '#16a34a', // green
  EXPOSED_WIRING: '#dc2626', // red
  DAMAGED_INFRASTRUCTURE: '#4f46e5', // indigo
  OTHER: '#64748b', // slate
};
