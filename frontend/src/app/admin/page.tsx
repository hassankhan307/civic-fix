'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { StatusBadge } from '../../components/StatusBadge';
import { SeverityBadge } from '../../components/SeverityBadge';
import { PriorityBadge } from '../../components/PriorityBadge';
import { formatCategory, formatDate } from '../../lib/utils';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  TrendingUp,
  ArrowRight,
  ClipboardCheck,
  Users,
  Timer,
  AlertOctagon,
} from 'lucide-react';

export default function AdminOverviewPage() {
  const [data, setData] = useState<any | null>(null);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOverview() {
      try {
        const [dashRes, reportsRes] = await Promise.all([
          api.admin.getDashboard(),
          api.admin.getReports({ limit: 5 }),
        ]);

        if (dashRes?.data) setData(dashRes.data);
        if (reportsRes?.data) setRecentReports(reportsRes.data);
      } catch (err) {
        console.error('Failed to load admin overview:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadOverview();
  }, []);

  if (isLoading) {
    return <div className="py-20 text-center text-slate-400 text-xs">Loading operations KPI metrics...</div>;
  }

  const kpis = [
    {
      title: 'Total Tracked Issues',
      value: data?.totalReports || 0,
      icon: <ClipboardCheck className="w-5 h-5 text-blue-600" />,
      bg: 'bg-blue-50',
    },
    {
      title: 'Awaiting Verification',
      value: data?.awaitingVerification || 0,
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      bg: 'bg-amber-50',
      badge: (data?.awaitingVerification || 0) > 0 ? 'Requires Action' : undefined,
    },
    {
      title: 'Active Work In Progress',
      value: data?.inProgress || 0,
      icon: <Timer className="w-5 h-5 text-purple-600" />,
      bg: 'bg-purple-50',
    },
    {
      title: 'Successfully Resolved',
      value: data?.resolved || 0,
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-50',
    },
    {
      title: 'Critical Hazards',
      value: data?.criticalIssues || 0,
      icon: <Flame className="w-5 h-5 text-rose-600" />,
      bg: 'bg-rose-50',
      alert: (data?.criticalIssues || 0) > 0,
    },
    {
      title: 'SLA Overdue Breaches',
      value: data?.overdueCount || 0,
      icon: <AlertOctagon className="w-5 h-5 text-orange-600" />,
      bg: 'bg-orange-50',
    },
    {
      title: 'Avg. Resolution Time',
      value: `${data?.averageResolutionHours || 0} hrs`,
      icon: <Clock className="w-5 h-5 text-slate-600" />,
      bg: 'bg-slate-50',
    },
    {
      title: 'Resolution Rate',
      value: data?.resolutionRate || '0%',
      icon: <TrendingUp className="w-5 h-5 text-teal-600" />,
      bg: 'bg-teal-50',
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operations Control Center</h1>
          <p className="text-xs text-slate-600">
            Real-time municipal triage, resource allocation, and SLA performance indicators.
          </p>
        </div>
        <Link
          href="/admin/reports"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
        >
          <span>Open Full Triage Table</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className={`p-4 bg-white rounded-2xl border ${
              kpi.alert ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'
            } shadow-2xs space-y-3`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">{kpi.title}</span>
              <div className={`p-2 rounded-xl ${kpi.bg}`}>{kpi.icon}</div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {kpi.value}
            </div>
            {kpi.badge && (
              <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                {kpi.badge}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Immediate Triage Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Priority Triage Queue</h2>
            <p className="text-xs text-slate-500">Highest priority unresolved civic tickets</p>
          </div>
          <Link
            href="/admin/reports"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            Manage All ({data?.totalReports || 0}) →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Issue Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Priority Score</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentReports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-blue-600">
                    <Link href="/admin/reports">{r.ticketNumber}</Link>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900 max-w-[200px] truncate">
                    {r.title}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatCategory(r.category)}</td>
                  <td className="px-4 py-3">
                    <SeverityBadge severity={r.severity} />
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge score={r.priorityScore} level={r.priorityLevel} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-slate-400">{formatDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
