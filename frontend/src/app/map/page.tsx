'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { StatusBadge } from '../../components/StatusBadge';
import { SeverityBadge } from '../../components/SeverityBadge';
import { PriorityBadge } from '../../components/PriorityBadge';
import { formatCategory, formatDate } from '../../lib/utils';
import dynamic from 'next/dynamic';
import {
  MapPin,
  List,
  Filter,
  Search,
  Layers,
  ArrowRight,
  Eye,
} from 'lucide-react';

const DynamicMap = dynamic(() => import('../../components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
      Loading interactive map...
    </div>
  ),
});

export default function PublicMapPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      setIsLoading(true);
      try {
        const res = await api.reports.getAll({
          category: categoryFilter || undefined,
          status: statusFilter || undefined,
          severity: severityFilter || undefined,
          search: search || undefined,
          limit: 100,
        });
        if (res?.data) {
          setReports(res.data);
        }
      } catch (err) {
        console.error('Failed to load map reports:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadReports();
  }, [categoryFilter, statusFilter, severityFilter, search]);

  const mapMarkers = reports.map((r) => ({
    id: r.id,
    latitude: r.latitude,
    longitude: r.longitude,
    title: r.title,
    ticketNumber: r.ticketNumber,
    category: r.category,
    severity: r.severity,
    status: r.status,
    address: r.address,
    imageUrl: r.images?.[0]?.url,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Page Title & View Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Public Issues Map</h1>
          <p className="text-xs text-slate-600">
            Explore reported civic and infrastructure issues in your community.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              viewMode === 'map'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Map View</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              viewMode === 'list'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Accessible List View</span>
          </button>
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
            placeholder="Search keywords or ticket..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500"
          />
        </div>

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

      {/* Main Content: Map or List */}
      {viewMode === 'map' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden p-2">
          <DynamicMap
            markers={mapMarkers}
            center={[40.718, -74.004]}
            zoom={13}
            className="h-[600px] w-full rounded-xl"
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {reports.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No matching reports found.
              </div>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="p-4 sm:p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-600">
                        {r.ticketNumber}
                      </span>
                      <StatusBadge status={r.status} size="sm" />
                      <SeverityBadge severity={r.severity} />
                    </div>
                    <h3 className="font-semibold text-slate-900 text-sm">{r.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-1">{r.description}</p>
                    <div className="text-[11px] text-slate-400 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {r.address || `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`}
                      </span>
                      <span>{formatDate(r.createdAt)}</span>
                    </div>
                  </div>
                  <PriorityBadge score={r.priorityScore} level={r.priorityLevel} />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
