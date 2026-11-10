import React from 'react';
import { cn } from '../lib/utils';
import { AlertTriangle, AlertCircle, Info, ShieldAlert } from 'lucide-react';

interface SeverityBadgeProps {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  className?: string;
  showIcon?: boolean;
}

export function SeverityBadge({
  severity,
  className,
  showIcon = true,
}: SeverityBadgeProps) {
  const norm = (severity || '').toUpperCase();

  const configs: Record<
    string,
    { bg: string; text: string; border: string; icon: React.ReactNode; label: string }
  > = {
    LOW: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: <Info className="w-3.5 h-3.5" />,
      label: 'Low Severity',
    },
    MEDIUM: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      label: 'Medium Severity',
    },
    HIGH: {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      label: 'High Severity',
    },
    CRITICAL: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-300 font-semibold animate-pulse',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-red-600" />,
      label: 'Critical Hazard',
    },
  };

  const cfg = configs[norm] || configs.MEDIUM;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs border',
        cfg.bg,
        cfg.text,
        cfg.border,
        className
      )}
    >
      {showIcon && cfg.icon}
      {cfg.label}
    </span>
  );
}
