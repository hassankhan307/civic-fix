'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { formatCategory, formatDate } from '../lib/utils';
import dynamic from 'next/dynamic';
import {
  Camera,
  Cpu,
  MapPin,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Building2,
  Sparkles,
} from 'lucide-react';

const DynamicMap = dynamic(() => import('../components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-96 w-full rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
      Loading interactive map...
    </div>
  ),
});

export default function HomePage() {
  const [stats, setStats] = useState({
    totalReports: 0,
    resolved: 0,
    inProgress: 0,
    resolutionRate: '85%',
  });
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [dashRes, reportsRes] = await Promise.all([
          api.admin.getDashboard().catch(() => null),
          api.reports.getAll({ limit: 6 }),
        ]);

        if (dashRes?.data) {
          setStats({
            totalReports: dashRes.data.totalReports || 5,
            resolved: dashRes.data.resolved || 1,
            inProgress: dashRes.data.inProgress + dashRes.data.assigned || 2,
            resolutionRate: dashRes.data.resolutionRate || '85%',
          });
        }

        if (reportsRes?.data) {
          setRecentReports(reportsRes.data);
          setMapMarkers(
            reportsRes.data.map((r: any) => ({
              id: r.id,
              latitude: r.latitude,
              longitude: r.longitude,
              title: r.title,
              ticketNumber: r.ticketNumber,
              category: r.category,
              severity: r.severity,
              status: r.status,
            }))
          );
        }
      } catch (err) {
        console.error('Failed to load home page data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="flex flex-col gap-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-white to-slate-50 pt-16 pb-20 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold tracking-wide shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>AI-Powered Civic Problem Reporting & Triage</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Report Neighborhood Issues.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">
                Fix Local Infrastructure.
              </span>
            </h1>

            <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Snap a photo of potholes, broken streetlights, or water leaks. Our AI vision model
              identifies the hazard, estimates urgency, and dispatches the ticket directly to
              municipal operations teams.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                href="/report"
                className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <Camera className="w-5 h-5" />
                <span>Report an Issue Now</span>
              </Link>
              <Link
                href="/map"
                className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl font-semibold shadow-2xs flex items-center justify-center gap-2 transition-colors"
              >
                <MapPin className="w-5 h-5 text-slate-500" />
                <span>Explore Local Issues</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Summary Statistics Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full -mt-8">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-4 border-r border-slate-100 last:border-none p-2">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {stats.totalReports}
              </div>
              <div className="text-xs text-slate-500 font-medium">Total Issues Tracked</div>
            </div>
          </div>

          <div className="flex items-center gap-4 border-r border-slate-100 last:border-none p-2">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats.inProgress}</div>
              <div className="text-xs text-slate-500 font-medium">Under Active Repair</div>
            </div>
          </div>

          <div className="flex items-center gap-4 border-r border-slate-100 last:border-none p-2">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats.resolved}</div>
              <div className="text-xs text-slate-500 font-medium">Resolved Problems</div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-2">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats.resolutionRate}</div>
              <div className="text-xs text-slate-500 font-medium">Municipal Resolution Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-3xl font-bold text-slate-900">How CivicFix Works</h2>
          <p className="text-slate-600 text-sm max-w-xl mx-auto">
            From smart phone photo capture to field crew resolution, transparent municipal triage in 4 steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs relative">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center mb-4">
              1
            </div>
            <h3 className="font-semibold text-slate-900 text-base mb-2">Capture & Upload</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Take or upload a photo of the problem on mobile or desktop with geolocation tag.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs relative">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 font-bold flex items-center justify-center mb-4">
              2
            </div>
            <h3 className="font-semibold text-slate-900 text-base mb-2">AI Vision Assessment</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              AI classifies damage category, rates severity, and generates an actionable report draft for citizen review.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs relative">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 font-bold flex items-center justify-center mb-4">
              3
            </div>
            <h3 className="font-semibold text-slate-900 text-base mb-2">Municipal Triage</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              City administrators verify reports, prevent duplicates, and dispatch to responsible field departments.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs relative">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center mb-4">
              4
            </div>
            <h3 className="font-semibold text-slate-900 text-base mb-2">Resolved & Verified</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Crews complete repairs, upload resolution proof, and citizens confirm the problem has been solved.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Map Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Live Municipal Issues Map</h2>
            <p className="text-slate-600 text-xs">
              Real-time geospatial visualization of reported neighborhood infrastructure problems.
            </p>
          </div>
          <Link
            href="/map"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            Open Full Map <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="h-96 w-full rounded-2xl overflow-hidden shadow-lg border border-slate-200">
          <DynamicMap markers={mapMarkers} center={[40.718, -74.004]} zoom={13} className="h-full w-full" />
        </div>
      </section>

      {/* Recent Public Reports */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Recent Reports</h2>
            <p className="text-slate-600 text-xs">Latest community tickets being processed by city staff.</p>
          </div>
          <Link
            href="/map"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            View All Reports <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentReports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-shadow p-5 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-slate-500">
                    {report.ticketNumber}
                  </span>
                  <StatusBadge status={report.status} size="sm" />
                </div>

                <h3 className="font-semibold text-slate-900 text-sm line-clamp-1">{report.title}</h3>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {report.description}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {formatCategory(report.category)}
                  </span>
                  <SeverityBadge severity={report.severity} />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 truncate max-w-[180px]">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {report.address || `${report.latitude.toFixed(3)}, ${report.longitude.toFixed(3)}`}
                </span>
                <span>{formatDate(report.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
