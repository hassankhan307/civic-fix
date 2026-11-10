'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ClipboardList,
  MapPin,
  BarChart3,
  ShieldAlert,
  Users,
  Building,
  ArrowLeft,
  Wrench,
  Shield,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isStaff, isAdmin, quickLogin, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-20 text-slate-400 text-sm">
        Authenticating municipal session...
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-2xl border border-slate-200 shadow-md text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Restricted Operations Console</h2>
        <p className="text-xs text-slate-600">
          This portal requires municipal Administrator or Field Staff authorization.
        </p>
        <button
          onClick={() => quickLogin('admin')}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-sm"
        >
          Sign in as Administrator (Demo)
        </button>
      </div>
    );
  }

  const links = [
    { href: '/admin', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { href: '/admin/reports', label: 'Report Management', icon: <ClipboardList className="w-4 h-4" /> },
    { href: '/admin/map', label: 'Interactive Map & Heatmap', icon: <MapPin className="w-4 h-4" /> },
    ...(isAdmin
      ? [{ href: '/admin/analytics', label: 'Analytics & SLA', icon: <BarChart3 className="w-4 h-4" /> }]
      : []),
  ];

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-50 min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-4 space-y-6 shrink-0">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            {isAdmin ? <Shield className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">
              {isAdmin ? 'Municipal Operations' : 'Field Response Staff'}
            </div>
            <div className="text-[10px] text-slate-500 uppercase">{user?.role}</div>
          </div>
        </div>

        <nav className="space-y-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="pt-6 border-t border-slate-100">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 font-medium px-3 py-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Portal</span>
          </Link>
        </div>
      </aside>

      {/* Main Admin Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">{children}</main>
    </div>
  );
}
