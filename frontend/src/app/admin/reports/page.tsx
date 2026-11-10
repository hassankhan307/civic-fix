'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { StatusBadge } from '../../../components/StatusBadge';
import { SeverityBadge } from '../../../components/SeverityBadge';
import { PriorityBadge } from '../../../components/PriorityBadge';
import { formatCategory, formatDate } from '../../../lib/utils';
import dynamic from 'next/dynamic';
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Building,
  Merge,
  ArrowUpDown,
  Eye,
  X,
  FileCheck,
  Send,
  AlertTriangle,
  MapPin,
  Sparkles,
  Camera,
} from 'lucide-react';

const DynamicMap = dynamic(() => import('../../../components/MapComponent'), {
  ssr: false,
  loading: () => <div className="h-48 w-full bg-slate-100 rounded-xl" />,
});

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [page, setPage] = useState(1);

  // Departments & Staff lookup
  const [departments, setDepartments] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);

  // Triage Modal State
  const [activeReport, setActiveReport] = useState<any | null>(null);
  const [triageAction, setTriageAction] = useState<string | null>(null); // 'status' | 'assign' | 'priority' | 'merge'
  const [actionComment, setActionComment] = useState('');
  const [targetStatus, setTargetStatus] = useState('');
  const [targetDepartment, setTargetDepartment] = useState('');
  const [targetStaff, setTargetStaff] = useState('');
  const [targetPriority, setTargetPriority] = useState(50);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [selectedDuplicatesToMerge, setSelectedDuplicatesToMerge] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Internal Note State
  const [internalNote, setInternalNote] = useState('');

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await api.admin.getReports({
        page,
        limit: 15,
        search: search || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        severity: severityFilter || undefined,
      });

      if (res?.data) {
        setReports(res.data);
        if (res.pagination) setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch admin reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [page, search, statusFilter, categoryFilter, severityFilter]);

  useEffect(() => {
    // Load lookup data
    api.admin.getDepartments().then((res) => res.data && setDepartments(res.data));
    api.admin.getStaff().then((res) => res.data && setStaffList(res.data));
  }, []);

  const openReportDetails = async (id: string) => {
    try {
      const res = await api.reports.getById(id);
      if (res?.data) {
        setActiveReport(res.data);
        setTargetPriority(res.data.priorityScore || 50);
        setTargetDepartment(res.data.assignedDepartmentId || '');
        setTargetStaff(res.data.assignedStaffId || '');
      }
    } catch (err) {
      console.error('Failed to load full report details:', err);
    }
  };

  // Status transition handler
  const handleUpdateStatus = async (status: string) => {
    if (!activeReport) return;
    setIsProcessing(true);
    try {
      await api.admin.updateStatus(activeReport.id, {
        status,
        comment: actionComment,
        rejectionReason: status === 'REJECTED' ? actionComment : undefined,
        resolutionNotes: status === 'RESOLVED' ? resolutionNotes : undefined,
      });
      alert(`Report status successfully updated to ${status}`);
      openReportDetails(activeReport.id);
      fetchReports();
      setTriageAction(null);
      setActionComment('');
    } catch (err: any) {
      alert(err.message || 'Status transition failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Assignment handler
  const handleAssign = async () => {
    if (!activeReport) return;
    setIsProcessing(true);
    try {
      await api.admin.assignReport(activeReport.id, {
        departmentId: targetDepartment || undefined,
        staffId: targetStaff || undefined,
        reason: actionComment,
      });
      alert('Report successfully assigned to department/staff');
      openReportDetails(activeReport.id);
      fetchReports();
      setTriageAction(null);
      setActionComment('');
    } catch (err: any) {
      alert(err.message || 'Assignment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Priority update handler
  const handleUpdatePriority = async () => {
    if (!activeReport) return;
    setIsProcessing(true);
    try {
      await api.admin.updatePriority(activeReport.id, {
        priorityScore: targetPriority,
        reason: actionComment,
      });
      alert('Report priority score adjusted');
      openReportDetails(activeReport.id);
      fetchReports();
      setTriageAction(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update priority');
    } finally {
      setIsProcessing(false);
    }
  };

  // Merge duplicates handler
  const handleMergeDuplicates = async () => {
    if (!activeReport || selectedDuplicatesToMerge.length === 0) return;
    setIsProcessing(true);
    try {
      await api.admin.mergeDuplicates(activeReport.id, {
        duplicateReportIds: selectedDuplicatesToMerge,
        reason: actionComment || 'Confirmed duplicate issue at same location',
      });
      alert('Duplicates successfully merged into canonical report');
      openReportDetails(activeReport.id);
      fetchReports();
      setTriageAction(null);
      setSelectedDuplicatesToMerge([]);
    } catch (err: any) {
      alert(err.message || 'Failed to merge duplicates');
    } finally {
      setIsProcessing(false);
    }
  };

  // Add internal note
  const handleAddInternalNote = async () => {
    if (!activeReport || !internalNote.trim()) return;
    try {
      await api.reports.addComment(activeReport.id, internalNote, true);
      setInternalNote('');
      openReportDetails(activeReport.id);
    } catch (err: any) {
      alert(err.message || 'Failed to add note');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Municipal Report Management</h1>
          <p className="text-xs text-slate-600">
            Verify, prioritize, dispatch, and resolve municipal infrastructure issues.
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
          {pagination.total} Total Reports Found
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticket, title, location..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="REPORTED">Reported (New)</option>
          <option value="VERIFIED">Verified</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="REJECTED">Rejected</option>
          <option value="DUPLICATE">Duplicate</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All Categories</option>
          <option value="POTHOLE">Potholes & Roads</option>
          <option value="BROKEN_STREETLIGHT">Streetlights</option>
          <option value="GARBAGE_ACCUMULATION">Garbage & Waste</option>
          <option value="WATER_LEAKAGE">Water Leakage</option>
          <option value="BLOCKED_DRAINAGE">Blocked Drainage</option>
          <option value="DAMAGED_SIDEWALK">Damaged Sidewalks</option>
          <option value="FALLEN_TREE">Fallen Trees</option>
          <option value="EXPOSED_WIRING">Exposed Wiring</option>
          <option value="DAMAGED_INFRASTRUCTURE">Damaged Structures</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All Severities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>

      {/* Report Management Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Ticket ID</th>
                <th className="px-4 py-3">Issue Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Department / Staff</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading reports data...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No reports match this criteria.
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-blue-600">
                      {r.ticketNumber}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 max-w-[180px] truncate">
                      {r.title}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatCategory(r.category)}</td>
                    <td className="px-4 py-3">
                      <SeverityBadge severity={r.severity} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge score={r.priorityScore} level={r.priorityLevel} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.assignedDepartment ? (
                        <div>
                          <span className="font-semibold">{r.assignedDepartment.name}</span>
                          {r.assignedStaff && (
                            <div className="text-[10px] text-slate-400">{r.assignedStaff.name}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(r.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openReportDetails(r.id)}
                        className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold text-xs flex items-center gap-1 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Triage</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FULL REPORT TRIAGE MODAL */}
      {activeReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-extrabold text-blue-600">
                    {activeReport.ticketNumber}
                  </span>
                  <StatusBadge status={activeReport.status} />
                  <SeverityBadge severity={activeReport.severity} />
                  <PriorityBadge score={activeReport.priorityScore} level={activeReport.priorityLevel} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1">{activeReport.title}</h2>
              </div>
              <button
                onClick={() => {
                  setActiveReport(null);
                  setTriageAction(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-600 mr-2 uppercase">Actions:</span>

              {activeReport.status === 'REPORTED' && (
                <>
                  <button
                    onClick={() => {
                      setTargetStatus('VERIFIED');
                      setTriageAction('status');
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Verify Issue</span>
                  </button>
                  <button
                    onClick={() => {
                      setTargetStatus('REJECTED');
                      setTriageAction('status');
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </>
              )}

              <button
                onClick={() => setTriageAction('assign')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Assign Dept / Staff</span>
              </button>

              <button
                onClick={() => setTriageAction('priority')}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Adjust Priority</span>
              </button>

              {activeReport.status === 'ASSIGNED' && (
                <button
                  onClick={() => {
                    setTargetStatus('IN_PROGRESS');
                    setTriageAction('status');
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Mark In Progress</span>
                </button>
              )}

              {activeReport.status === 'IN_PROGRESS' && (
                <button
                  onClick={() => {
                    setTargetStatus('RESOLVED');
                    setTriageAction('status');
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Mark Resolved</span>
                </button>
              )}

              {activeReport.duplicateMatches?.length > 0 && (
                <button
                  onClick={() => setTriageAction('merge')}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs"
                >
                  <Merge className="w-3.5 h-3.5" />
                  <span>Merge Duplicates ({activeReport.duplicateMatches.length})</span>
                </button>
              )}
            </div>

            {/* Action Dialog Pane (conditional based on selected action) */}
            {triageAction === 'status' && (
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900">
                  Confirm Status Change to: <span className="text-blue-600">{targetStatus}</span>
                </h4>
                {targetStatus === 'RESOLVED' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Resolution Notes / Repairs Conducted
                    </label>
                    <textarea
                      rows={2}
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Detail work performed, parts replaced, or inspection result..."
                      className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800"
                    />
                  </div>
                )}
                {targetStatus === 'REJECTED' && (
                  <p className="text-xs text-rose-600 font-medium">
                    A specific rejection reason is required to notify the citizen.
                  </p>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Audit Comment / Reason
                  </label>
                  <input
                    type="text"
                    value={actionComment}
                    onChange={(e) => setActionComment(e.target.value)}
                    placeholder="Provide context for audit log..."
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={isProcessing || (targetStatus === 'REJECTED' && !actionComment.trim())}
                    onClick={() => handleUpdateStatus(targetStatus)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                  >
                    Confirm Status Update
                  </button>
                  <button
                    onClick={() => setTriageAction(null)}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {triageAction === 'assign' && (
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900">Assign Department & Staff Member</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Department
                    </label>
                    <select
                      value={targetDepartment}
                      onChange={(e) => setTargetDepartment(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
                    >
                      <option value="">Select Department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.slaHours}h SLA)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Staff Member
                    </label>
                    <select
                      value={targetStaff}
                      onChange={(e) => setTargetStaff(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
                    >
                      <option value="">Select Field Staff</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assignment Instructions
                  </label>
                  <input
                    type="text"
                    value={actionComment}
                    onChange={(e) => setActionComment(e.target.value)}
                    placeholder="Instructions for the assigned crew..."
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={isProcessing}
                    onClick={handleAssign}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                  >
                    Confirm Assignment
                  </button>
                  <button
                    onClick={() => setTriageAction(null)}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {triageAction === 'priority' && (
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900">Adjust Priority Score (0–100)</h4>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={targetPriority}
                    onChange={(e) => setTargetPriority(parseInt(e.target.value, 10))}
                    className="flex-1"
                  />
                  <span className="font-mono text-sm font-bold text-blue-600 w-12 text-right">
                    {targetPriority}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Adjustment Justification
                  </label>
                  <input
                    type="text"
                    value={actionComment}
                    onChange={(e) => setActionComment(e.target.value)}
                    placeholder="Why is priority being elevated or lowered?"
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={isProcessing}
                    onClick={handleUpdatePriority}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                  >
                    Save Priority
                  </button>
                  <button
                    onClick={() => setTriageAction(null)}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {triageAction === 'merge' && (
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-3">
                <h4 className="text-xs font-bold text-purple-900">
                  Merge Nearby Duplicates into this Canonical Ticket
                </h4>
                <p className="text-xs text-purple-800">
                  Select candidate tickets to link and merge. Merged tickets will be closed and citizen notifications redirected to this master ticket.
                </p>
                <div className="space-y-2">
                  {activeReport.duplicateMatches?.map((match: any) => (
                    <label
                      key={match.id}
                      className="p-3 bg-white rounded-lg border border-purple-200 flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedDuplicatesToMerge.includes(match.targetReportId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDuplicatesToMerge((prev) => [...prev, match.targetReportId]);
                            } else {
                              setSelectedDuplicatesToMerge((prev) =>
                                prev.filter((id) => id !== match.targetReportId)
                              );
                            }
                          }}
                        />
                        <div>
                          <span className="font-mono font-bold text-slate-800">
                            {match.targetReport?.ticketNumber}
                          </span>
                          <span className="text-slate-600 ml-2">{match.targetReport?.title}</span>
                          <div className="text-[10px] text-slate-400">
                            {match.distanceMeters}m away • {match.matchReason}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={match.targetReport?.status} size="sm" />
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={isProcessing || selectedDuplicatesToMerge.length === 0}
                    onClick={handleMergeDuplicates}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold"
                  >
                    Confirm Merge ({selectedDuplicatesToMerge.length})
                  </button>
                  <button
                    onClick={() => setTriageAction(null)}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Main Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Photos, AI Analysis, Description */}
              <div className="space-y-4">
                {activeReport.images?.length > 0 && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 h-64 bg-slate-100 flex items-center justify-center">
                    <img
                      src={activeReport.images[0].url}
                      alt="Incident photo"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-700">Citizen Description</span>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {activeReport.description}
                  </p>
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200">
                    Reporter: {activeReport.citizen?.name} ({activeReport.citizen?.email})
                  </div>
                </div>

                {activeReport.aiAnalysis && (
                  <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Analysis & Recommended Action
                      </span>
                      <span className="font-mono text-[10px]">
                        Model: {activeReport.aiAnalysis.modelVersion}
                      </span>
                    </div>
                    <p className="text-xs text-blue-900 leading-relaxed font-medium">
                      {activeReport.aiAnalysis.recommendedAction}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-blue-700 pt-1">
                      <span>Confidence: {Math.round(activeReport.aiAnalysis.confidence * 100)}%</span>
                      {activeReport.aiAnalysis.needsHumanReview && (
                        <span className="text-rose-600 font-semibold">• Flagged for human review</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Location Map, Status History, Internal Notes */}
              <div className="space-y-4">
                <div className="h-48 w-full rounded-xl overflow-hidden border border-slate-200">
                  <DynamicMap
                    center={[activeReport.latitude, activeReport.longitude]}
                    markers={[
                      {
                        id: activeReport.id,
                        latitude: activeReport.latitude,
                        longitude: activeReport.longitude,
                        ticketNumber: activeReport.ticketNumber,
                        category: activeReport.category,
                      },
                    ]}
                    zoom={15}
                    className="h-full w-full"
                  />
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {activeReport.address || `${activeReport.latitude}, ${activeReport.longitude}`}
                    {activeReport.landmark && ` • Landmark: ${activeReport.landmark}`}
                  </span>
                </div>

                {/* Status History Timeline */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Status Transition History
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-2 pl-3 border-l-2 border-slate-200 ml-1 text-xs">
                    {activeReport.statusHistory?.map((h: any) => (
                      <div key={h.id} className="relative pl-3">
                        <span className="absolute -left-[1.15rem] top-1 w-2.5 h-2.5 rounded-full bg-blue-600" />
                        <div className="font-semibold text-slate-800">{h.toStatus}</div>
                        {h.comment && <p className="text-slate-500 text-[11px]">{h.comment}</p>}
                        <div className="text-[10px] text-slate-400">
                          {formatDate(h.createdAt)} • by {h.changedBy?.name || 'System'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Internal Notes */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <span className="text-xs font-bold text-slate-800">Internal Operational Notes</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={internalNote}
                      onChange={(e) => setInternalNote(e.target.value)}
                      placeholder="Add private note for responders..."
                      className="flex-1 text-xs rounded-lg border border-slate-200 p-2 text-slate-800"
                    />
                    <button
                      onClick={handleAddInternalNote}
                      disabled={!internalNote.trim()}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
                    >
                      Add Note
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-24 overflow-y-auto text-xs">
                    {activeReport.comments
                      ?.filter((c: any) => c.isInternal)
                      .map((c: any) => (
                        <div key={c.id} className="p-2 bg-amber-50/60 rounded-lg text-[11px]">
                          <span className="font-semibold text-amber-900">{c.author?.name}:</span>{' '}
                          <span className="text-amber-800">{c.content}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
