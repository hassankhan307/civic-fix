'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { StatusBadge } from '../../../components/StatusBadge';
import { SeverityBadge } from '../../../components/SeverityBadge';
import { PriorityBadge } from '../../../components/PriorityBadge';
import { formatCategory, formatDate } from '../../../lib/utils';
import dynamic from 'next/dynamic';
import {
  MapPin,
  Flame,
  Layers,
  Filter,
  Eye,
  CheckCircle,
  Building,
} from 'lucide-react';

const DynamicMap = dynamic(() => import('../../../components/MapComponent'), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">Loading map...</div>,
});

const DynamicHeatmap = dynamic(() => import('../../../components/HeatmapComponent'), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">Loading heatmap layer...</div>,
});

export default function AdminMapPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [heatPoints, setHeatPoints] = useState<any[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [mapRes, heatRes] = await Promise.all([
          api.admin.getMap({ status: statusFilter, category: categoryFilter }),
          api.admin.getHeatmap(),
        ]);

        if (mapRes?.data) setReports(mapRes.data);
        if (heatRes?.data) setHeatPoints(heatRes.data);
      } catch (err) {
        console.error('Failed to load operations map data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [statusFilter, categoryFilter]);

  const markers = reports.map((r) => ({
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
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Geospatial Triage & Heatmap</h1>
          <p className="text-xs text-slate-600">
            Visualize municipal problem density, infrastructure hotspots, and neighborhood concentration.
          </p>
        </div>

        {/* Heatmap Layer Toggle */}
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
            showHeatmap
              ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/20'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>{showHeatmap ? 'Disable Heatmap Layer' : 'Enable Density Heatmap'}</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="REPORTED">Reported (Unverified)</option>
          <option value="VERIFIED">Verified</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 bg-white"
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

        <span className="text-xs font-medium text-slate-500 ml-auto flex items-center gap-1">
          Showing {reports.length} Geo-tagged reports
        </span>
      </div>

      {/* Map View */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-md">
        {showHeatmap ? (
          <DynamicHeatmap
            points={heatPoints}
            center={[40.718, -74.004]}
            zoom={13}
            className="h-[600px] w-full rounded-xl"
          />
        ) : (
          <DynamicMap
            markers={markers}
            center={[40.718, -74.004]}
            zoom={13}
            className="h-[600px] w-full rounded-xl"
          />
        )}
      </div>
    </div>
  );
}
