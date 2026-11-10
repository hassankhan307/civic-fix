'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { StatusBadge } from '../../components/StatusBadge';
import { SeverityBadge } from '../../components/SeverityBadge';
import { PriorityBadge } from '../../components/PriorityBadge';
import { formatCategory, formatDate } from '../../lib/utils';
import Link from 'next/link';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  MapPin,
  Search,
  Filter,
  Check,
  X,
  Send,
  Eye,
  PlusCircle,
} from 'lucide-react';

export default function MyReportsPage() {
  const { user, isAuthenticated, quickLogin } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Comment state
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Resolution confirmation
  const [confirmNotes, setConfirmNotes] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await api.reports.getAll({
        mine: 'true',
        search: search || undefined,
        status: statusFilter || undefined,
      });
      if (res?.data) {
        setReports(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch personal reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchReports();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, search, statusFilter]);

  const handleSelectReport = async (reportId: string) => {
    try {
      const res = await api.reports.getById(reportId);
      if (res?.data) {
        setSelectedReport(res.data);
      }
    } catch (err) {
      console.error('Failed to load full report details:', err);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedReport) return;
    setIsSubmittingComment(true);
    try {
      await api.reports.addComment(selectedReport.id, newComment, false);
      setNewComment('');
      handleSelectReport(selectedReport.id);
    } catch (err: any) {
      alert(err.message || 'Failed to submit comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleConfirmResolution = async (confirmed: boolean) => {
    if (!selectedReport) return;
    setIsConfirming(true);
    try {
      await api.reports.confirmResolution(selectedReport.id, confirmed, confirmNotes);
      alert(
        confirmed
          ? 'Thank you for verifying the municipal repair!'
          : 'Issue has been reopened for additional crew inspection.'
      );
      handleSelectReport(selectedReport.id);
      fetchReports();
    } catch (err: any) {
      alert(err.message || 'Failed to submit confirmation');
    } finally {
      setIsConfirming(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
        <FileText className="w-12 h-12 text-blue-600 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Sign in to Track Your Reports</h2>
        <p className="text-xs text-slate-600">
          Access real-time timeline updates, chat with municipal managers, and confirm resolutions.
        </p>
        <button
          onClick={() => quickLogin('citizen')}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-sm"
        >
          Sign in as Citizen (Demo)
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Problem Reports</h1>
          <p className="text-xs text-slate-600">
            Track resolution progress and provide feedback on your reported civic issues.
          </p>
        </div>
        <Link
          href="/report"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Report New Problem</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ticket ID, title, or address..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="REPORTED">Reported</option>
          <option value="VERIFIED">Verified</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>

      {/* Reports Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-sm">Loading your reports...</div>
      ) : reports.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-3">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-semibold text-slate-800">No reports found</h3>
          <p className="text-xs text-slate-400">You have not submitted any reports matching this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-shadow p-5 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-600">
                    {report.ticketNumber}
                  </span>
                  <StatusBadge status={report.status} size="sm" />
                </div>

                <h3 className="font-semibold text-slate-900 text-sm">{report.title}</h3>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {report.description}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {formatCategory(report.category)}
                  </span>
                  <SeverityBadge severity={report.severity} />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(report.createdAt)}
                </span>
                <button
                  onClick={() => handleSelectReport(report.id)}
                  className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Timeline</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL MODAL & STATUS TIMELINE */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-blue-600">
                    {selectedReport.ticketNumber}
                  </span>
                  <StatusBadge status={selectedReport.status} />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1">{selectedReport.title}</h2>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700">Problem Description</span>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                {selectedReport.description}
              </p>
            </div>

            {/* Resolution Evidence if Resolved */}
            {selectedReport.status === 'RESOLVED' && selectedReport.resolutionNotes && (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Resolution Notes from Field Crew</span>
                </div>
                <p className="text-xs text-emerald-900">{selectedReport.resolutionNotes}</p>
                {selectedReport.resolutionPhotoUrl && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-emerald-200 max-h-48">
                    <img
                      src={selectedReport.resolutionPhotoUrl}
                      alt="Resolution Proof"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Citizen Resolution Confirmation */}
                <div className="pt-3 border-t border-emerald-200/60 mt-3 space-y-2">
                  <span className="text-xs font-semibold text-emerald-900">
                    Did this resolve the problem?
                  </span>
                  <input
                    type="text"
                    value={confirmNotes}
                    onChange={(e) => setConfirmNotes(e.target.value)}
                    placeholder="Optional feedback for the crew..."
                    className="w-full text-xs rounded-lg border border-emerald-300 p-2 text-slate-800"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      disabled={isConfirming}
                      onClick={() => handleConfirmResolution(true)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm Resolved</span>
                    </button>
                    <button
                      disabled={isConfirming}
                      onClick={() => handleConfirmResolution(false)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Problem Persists (Reopen)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Status History Timeline */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                Lifecycle Timeline
              </span>
              <div className="space-y-3 pl-2 border-l-2 border-slate-200 ml-2">
                {selectedReport.statusHistory?.map((hist: any, index: number) => (
                  <div key={hist.id || index} className="relative pl-4">
                    <span className="absolute -left-[1.35rem] top-1 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">
                        {hist.toStatus}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDate(hist.createdAt)}
                      </span>
                    </div>
                    {hist.comment && (
                      <p className="text-xs text-slate-600 mt-0.5">{hist.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Comments Stream */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                <span>Comments & Inquiries</span>
              </span>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedReport.comments?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No comments posted yet.</p>
                ) : (
                  selectedReport.comments?.map((c: any) => (
                    <div key={c.id} className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">
                          {c.author?.name} ({c.author?.role})
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDate(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{c.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment input */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ask a question or provide additional info..."
                  className="flex-1 text-xs rounded-xl border border-slate-200 p-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
                <button
                  disabled={!newComment.trim() || isSubmittingComment}
                  onClick={handleAddComment}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
