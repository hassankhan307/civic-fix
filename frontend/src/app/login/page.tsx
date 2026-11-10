'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, LogIn, Lock, Mail, ArrowRight, UserCheck, Wrench, Shield } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, quickLogin, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuick = async (role: 'citizen' | 'admin' | 'staff') => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await quickLogin(role);
      router.push(role === 'admin' ? '/admin' : '/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Quick login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-16 px-4 w-full">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md shadow-blue-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Sign in to CivicFix</h1>
          <p className="text-xs text-slate-500">
            Manage reports, track municipal repairs, or access dispatch tools
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@civicfix.org"
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Login Switcher */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center">
            One-Click Demo Roles
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuick('citizen')}
              className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-center transition-colors text-xs font-semibold text-slate-700 hover:text-blue-700 flex flex-col items-center gap-1"
            >
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>Citizen</span>
            </button>
            <button
              onClick={() => handleQuick('admin')}
              className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-center transition-colors text-xs font-semibold text-slate-700 hover:text-blue-700 flex flex-col items-center gap-1"
            >
              <Shield className="w-4 h-4 text-purple-600" />
              <span>Admin</span>
            </button>
            <button
              onClick={() => handleQuick('staff')}
              className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-center transition-colors text-xs font-semibold text-slate-700 hover:text-blue-700 flex flex-col items-center gap-1"
            >
              <Wrench className="w-4 h-4 text-amber-600" />
              <span>Field Staff</span>
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500 pt-2">
          Don&apos;t have an account yet?{' '}
          <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-800">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
