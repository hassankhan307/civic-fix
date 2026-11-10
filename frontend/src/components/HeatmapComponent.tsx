'use client';

import React, { useEffect, useRef } from 'react';

export interface HeatPoint {
  id: string;
  lat: number;
  lng: number;
  weight: number;
  category?: string;
  severity?: string;
}

interface HeatmapComponentProps {
  points: HeatPoint[];
  center?: [number, number];
  zoom?: number;
  className?: string;
}

export default function HeatmapComponent({
  points = [],
  center = [40.7128, -74.006],
  zoom = 13,
  className = 'h-96 w-full',
}: HeatmapComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    import('leaflet').then((L) => {
      if (mapRef.current) return;

      const map = L.map(containerRef.current!, {
        center,
        zoom,
        scrollWheelZoom: true,
      });

      // Dark or clean carto style tiles for heatmap visualization
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB & OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const layer = L.layerGroup().addTo(map);
      heatLayerRef.current = layer;
      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !heatLayerRef.current) return;

    import('leaflet').then((L) => {
      const layer = heatLayerRef.current;
      layer.clearLayers();

      points.forEach((pt) => {
        // Density visualization using concentric semi-transparent circles
        const radius = Math.max(15, pt.weight * 35);
        const color = pt.weight > 0.75 ? '#dc2626' : pt.weight > 0.5 ? '#f97316' : '#3b82f6';

        // Outer glow
        L.circleMarker([pt.lat, pt.lng], {
          radius: radius * 1.6,
          fillColor: color,
          fillOpacity: 0.15,
          stroke: false,
        }).addTo(layer);

        // Core intensity
        L.circleMarker([pt.lat, pt.lng], {
          radius,
          fillColor: color,
          fillOpacity: 0.45,
          color: color,
          weight: 1,
        })
          .bindPopup(`
            <div style="font-size: 12px; font-weight: 600;">
              <div>Issue Intensity: ${Math.round(pt.weight * 100)}%</div>
              <div style="color: #64748b;">Category: ${pt.category || 'General'}</div>
            </div>
          `)
          .addTo(layer);
      });
    });
  }, [points]);

  return (
    <div className={`relative rounded-xl overflow-hidden shadow-inner border border-slate-200 ${className}`}>
      <div ref={containerRef} className="w-full h-full min-h-[350px]" />
    </div>
  );
}
