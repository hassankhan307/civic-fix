import React from 'react';
import { cn } from '../lib/utils';

export type StatusType =
  | 'REPORTED'
  | 'VERIFIED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED'
  | 'DUPLICATE'
  | string;

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, className, size = 'md' }: StatusBadgeProps) {
  const norm = (status || '').toUpperCase();

  const styles: Record<string, string> = {
    REPORTED: 'bg-blue-50 text-blue-700 border-blue-200',
    VERIFIED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    ASSIGNED: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
    RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
    DUPLICATE: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const labels: Record<string, string> = {
    REPORTED: 'Reported',
    VERIFIED: 'Verified',
    ASSIGNED: 'Assigned',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved',
    REJECTED: 'Rejected',
    DUPLICATE: 'Duplicate',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1 font-medium',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  };

  const badgeStyle = styles[norm] || 'bg-gray-100 text-gray-700 border-gray-200';
  const label = labels[norm] || norm;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border shadow-xs',
        badgeStyle,
        sizeClasses[size],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {label}
    </span>
  );
}
