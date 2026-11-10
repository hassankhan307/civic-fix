'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { NotificationDropdown } from './NotificationDropdown';
import {
  ShieldAlert,
  MapPin,
  FileText,
  LayoutDashboard,
  PlusCircle,
  LogIn,
  LogOut,
  User,
  Menu,
  X,
  Radio,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, isAdmin, isStaff, logout, quickLogin } = useAuth();
  const { isConnected } = useSocket();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/report', label: 'Report Issue', highlight: true },
    { href: '/map', label: 'Public Map' },
    ...(isAuthenticated ? [{ href: '/my-reports', label: 'My Reports' }] : []),
    ...(isStaff ? [{ href: '/admin', label: 'Operations Dashboard' }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-civic-900 via-civic-700 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg text-slate-900 tracking-tight leading-tight">
                  Civic<span className="text-blue-600">Fix</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium tracking-wide">
                  AI Municipal Reporting
                </span>
              </div>
            </Link>

            {/* Live WebSocket Status Dot */}
            <div
              className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-[11px] text-slate-600 ml-3"
              title={isConnected ? 'Connected to Real-time Stream' : 'Connecting to Stream...'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="font-medium text-[10px]">
                {isConnected ? 'LIVE' : 'SYNCING'}
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    link.highlight
                      ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700 ml-1'
                      : active
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated && <NotificationDropdown />}

            {isAuthenticated ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-900 leading-tight">
                    {user?.name}
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium uppercase">
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                {/* One-click Demo Switchers */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                  <span className="text-[10px] text-slate-400 font-semibold px-1">DEMO:</span>
                  <button
                    onClick={() => quickLogin('citizen')}
                    className="px-1.5 py-0.5 rounded bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-600 text-[11px] font-medium shadow-2xs"
                  >
                    Citizen
                  </button>
                  <button
                    onClick={() => quickLogin('admin')}
                    className="px-1.5 py-0.5 rounded bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-600 text-[11px] font-medium shadow-2xs"
                  >
                    Admin
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            {isAuthenticated && <NotificationDropdown />}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-6 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-base font-medium ${
                pathname === link.href ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-4 border-t border-slate-200">
            {isAuthenticated ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{user?.name}</div>
                  <div className="text-xs text-slate-500">{user?.role}</div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-1.5 text-xs text-red-600 bg-red-50 rounded-lg font-medium"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center py-2 bg-blue-600 text-white rounded-lg font-medium"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
