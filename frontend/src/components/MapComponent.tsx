'use client';

import React, { useEffect, useRef } from 'react';
import { formatCategory, CATEGORY_COLORS } from '../lib/utils';
import { StatusBadge } from './StatusBadge';

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  ticketNumber?: string;
  category?: string;
  severity?: string;
  status?: string;
  address?: string;
  imageUrl?: string;
}

interface MapComponentProps {
  markers?: MapMarker[];
  center?: [number, number];
  zoom?: number;
  interactiveSelection?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  selectedLocation?: [number, number] | null;
  className?: string;
  onMarkerClick?: (marker: MapMarker) => void;
}

export default function MapComponent({
  markers = [],
  center = [40.7128, -74.006], // Default NYC coordinates
  zoom = 13,
  interactiveSelection = false,
  onLocationSelect,
  selectedLocation,
  className = 'h-96 w-full',
  onMarkerClick,
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const selectedMarkerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    // Dynamically import Leaflet on client side
    import('leaflet').then((L) => {
      // Avoid re-initialization if already created
      if (mapInstanceRef.current) return;

      const map = L.map(mapContainerRef.current!, {
        center: selectedLocation || center,
        zoom,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;

      // Handle click for interactive location selection
      if (interactiveSelection) {
        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          if (onLocationSelect) {
            onLocationSelect(lat, lng);
          }
        });
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update selection marker
  useEffect(() => {
    if (typeof window === 'undefined' || !mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      if (selectedLocation) {
        if (selectedMarkerRef.current) {
          selectedMarkerRef.current.setLatLng(selectedLocation);
        } else {
          // Draggable red pin
          const pinIcon = L.divIcon({
            className: 'custom-pin',
            html: `
              <div style="background-color: #ef4444; width: 28px; height: 28px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                <div style="width: 10px; height: 10px; background: white; border-radius: 50%; transform: rotate(45deg);"></div>
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 28],
          });

          const marker = L.marker(selectedLocation, {
            icon: pinIcon,
            draggable: interactiveSelection,
          }).addTo(map);

          if (interactiveSelection) {
            marker.on('dragend', (e: any) => {
              const { lat, lng } = e.target.getLatLng();
              if (onLocationSelect) onLocationSelect(lat, lng);
            });
          }

          selectedMarkerRef.current = marker;
        }

        map.setView(selectedLocation, map.getZoom());
      } else if (selectedMarkerRef.current) {
        selectedMarkerRef.current.remove();
        selectedMarkerRef.current = null;
      }
    });
  }, [selectedLocation, interactiveSelection]);

  // Update public/admin report markers
  useEffect(() => {
    if (typeof window === 'undefined' || !mapInstanceRef.current || !markersLayerRef.current) return;

    import('leaflet').then((L) => {
      const markersLayer = markersLayerRef.current;
      markersLayer.clearLayers();

      markers.forEach((m) => {
        if (!m.latitude || !m.longitude) return;

        const color = CATEGORY_COLORS[m.category?.toUpperCase() || 'OTHER'] || '#3b82f6';

        const customIcon = L.divIcon({
          className: 'custom-category-pin',
          html: `
            <div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center;">
              <div style="width: 8px; height: 8px; background: white; border-radius: 50%; transform: rotate(45deg);"></div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 24],
        });

        const marker = L.marker([m.latitude, m.longitude], { icon: customIcon });

        const popupContent = `
          <div style="font-family: inherit; font-size: 12px; max-width: 200px;">
            <div style="font-weight: 700; color: #1e293b; margin-bottom: 2px;">${m.ticketNumber || 'Ticket'}</div>
            <div style="font-weight: 600; color: #0f172a; font-size: 13px; margin-bottom: 4px;">${m.title || 'Civic Issue'}</div>
            <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">${formatCategory(m.category)}</div>
            <div style="display: flex; gap: 4px; align-items: center; font-size: 10px; margin-top: 4px;">
              <span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${m.status || 'REPORTED'}</span>
              <span style="color: #ef4444; font-weight: 600;">${m.severity || 'MEDIUM'}</span>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

        if (onMarkerClick) {
          marker.on('click', () => onMarkerClick(m));
        }

        marker.addTo(markersLayer);
      });
    });
  }, [markers, onMarkerClick]);

  return (
    <div className={`relative rounded-xl overflow-hidden shadow-inner border border-slate-200 ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full min-h-[300px]" />
    </div>
  );
}
