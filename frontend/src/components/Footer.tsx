import React from 'react';
import Link from 'next/link';
import { ShieldAlert, Heart, ExternalLink, HelpCircle, PhoneCall } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand & Description */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">CivicFix</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Empowering citizens to report local civic problems while enabling municipal teams to
              intelligently prioritize, triage, and resolve infrastructure issues.
            </p>
            <div className="text-[11px] text-slate-500">
              Emergency Services: Call 911 immediately for life-threatening emergencies.
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Citizen Portal
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/report" className="hover:text-white transition-colors">
                  Report a Problem
                </Link>
              </li>
              <li>
                <Link href="/map" className="hover:text-white transition-colors">
                  Public Issues Map
                </Link>
              </li>
              <li>
                <Link href="/my-reports" className="hover:text-white transition-colors">
                  Track Personal Tickets
                </Link>
              </li>
              <li>
                <Link href="/api/docs" target="_blank" className="hover:text-white transition-colors flex items-center gap-1">
                  API & OpenAPI Specs <ExternalLink className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Municipal Operations */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Municipal Operations
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/admin" className="hover:text-white transition-colors">
                  Admin Dashboard
                </Link>
              </li>
              <li>
                <Link href="/admin/reports" className="hover:text-white transition-colors">
                  Issue Triage Queue
                </Link>
              </li>
              <li>
                <Link href="/admin/map" className="hover:text-white transition-colors">
                  Spatial Density Heatmap
                </Link>
              </li>
              <li>
                <Link href="/admin/analytics" className="hover:text-white transition-colors">
                  SLA & Performance Metrics
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: AI & Ethics Disclosure */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              AI Transparency Notice
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI analysis drafts descriptions, estimates severities, and recommends priority
              scores. All predictions require citizen confirmation and municipal officer verification
              before dispatching field work.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <PhoneCall className="w-4 h-4 text-blue-400" />
              <span>Municipal Helpline: 311</span>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 CivicFix Platform. Open-source municipal software.</p>
          <p className="flex items-center gap-1">
            Engineered with Next.js, Express, PostgreSQL, Prisma & Python FastAPI
          </p>
        </div>
      </div>
    </footer>
  );
}
