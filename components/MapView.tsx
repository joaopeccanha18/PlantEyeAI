import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import { HistoryItem, PlantStatus } from '../types';

// Fix para ícones do Leaflet quebrados com Vite/Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapViewProps {
  history: HistoryItem[];
  onSelectItem: (item: HistoryItem) => void;
}

/** Cores e emojis por estado fitossanitário */
const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; emoji: string; label: string }> = {
  HEALTHY:  { color: '#065f46', bg: '#d1fae5', border: '#10b981', emoji: '🟢', label: 'Saudável' },
  THIRSTY:  { color: '#92400e', bg: '#fef3c7', border: '#f59e0b', emoji: '🟡', label: 'Em Stress' },
  SICK:     { color: '#991b1b', bg: '#fee2e2', border: '#ef4444', emoji: '🔴', label: 'Doente/Crítico' },
  UNKNOWN:  { color: '#374151', bg: '#f3f4f6', border: '#9ca3af', emoji: '⚪', label: 'Inconclusivo' },
  INVASIVE: { color: '#581c87', bg: '#f3e8ff', border: '#9333ea', emoji: '⚠️', label: 'Invasora' },
  REMOVED:  { color: '#374151', bg: '#e5e7eb', border: '#6b7280', emoji: '✅', label: 'Invasora Removida' },
};

/** Cria um ícone SVG colorido por estado — com X para invasoras */
function createMarkerIcon(status: string, isInvasive: boolean, removed: boolean) {
  let cfgKey = status;
  if (isInvasive) cfgKey = removed ? 'REMOVED' : 'INVASIVE';
  const cfg = STATUS_CONFIG[cfgKey] ?? STATUS_CONFIG.UNKNOWN;

  // Símbolo interior: X para invasora ativa, ✓ para removida, ponto para eucalipto
  const inner = isInvasive
    ? removed
      ? `<text x="18" y="20" text-anchor="middle" font-size="10" font-weight="900" fill="${cfg.border}">✓</text>`
      : `<text x="18" y="21" text-anchor="middle" font-size="11" font-weight="900" fill="${cfg.border}">✕</text>`
    : `<circle cx="18" cy="16" r="5" fill="${cfg.border}"/>`;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 50" width="36" height="50">
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/>
      </filter>
      <path filter="url(#shadow)"
        d="M18 2C10.268 2 4 8.268 4 16c0 10 14 30 14 30s14-20 14-30C32 8.268 25.732 2 18 2z"
        fill="${cfg.border}" stroke="white" stroke-width="2"/>
      <circle cx="18" cy="16" r="8" fill="white"/>
      ${inner}
    </svg>`;

  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [36, 50],
    iconAnchor: [18, 50],
    popupAnchor: [0, -52],
  });
}

const MapView: React.FC<MapViewProps> = ({ history, onSelectItem }) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const itemsWithCoords = history.filter(item => item.coords != null);

  const buildPopup = useCallback((item: HistoryItem, onSelect: (i: HistoryItem) => void) => {
    const isInvasive = item.isInvasive ?? false;
    const removed   = isInvasive && !!item.removedAt;
    const cfgKey    = isInvasive ? (removed ? 'REMOVED' : 'INVASIVE') : item.status;
    const cfg       = STATUS_CONFIG[cfgKey] ?? STATUS_CONFIG.UNKNOWN;
    const date = new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(item.timestamp));

    const container = document.createElement('div');
    container.style.cssText = 'width:220px;font-family:system-ui,sans-serif;';
    container.innerHTML = `
      <div style="border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.12);background:white;">
        ${item.imageUrl ? `
          <div style="height:100px;overflow:hidden;background:#f0fdf4;position:relative;">
            <img src="${item.imageUrl}" style="width:100%;height:100%;object-fit:cover;" alt="Captura" />
            ${isInvasive ? `<div style="position:absolute;inset:0;background:rgba(147,51,234,0.15);"></div>` : ''}
          </div>` : ''}
        <div style="padding:12px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="
              background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.border};
              font-size:9px;font-weight:900;padding:2px 8px;border-radius:99px;
              text-transform:uppercase;letter-spacing:.08em;">
              ${cfg.emoji} ${isInvasive ? (removed ? 'Removida' : 'INVASORA') : cfg.label}
            </span>
            <span style="font-size:9px;color:#6b7280;margin-left:auto;background:#f3f4f6;padding:2px 6px;border-radius:99px;font-weight:700;">
              #${String(item.analysisId ?? 0).padStart(3, '0')}
            </span>
          </div>
          <p style="font-size:13px;font-weight:800;color:${isInvasive ? '#7e22ce' : '#064e3b'};margin:0 0 2px;font-style:italic;">
            ${item.invasiveSpecies || item.species}
          </p>
          <p style="font-size:10px;color:#6b7280;margin:0 0 10px;">${date}</p>
          <button id="popup-btn-${item.id}" style="
            width:100%;padding:8px;border:none;border-radius:8px;
            background:${isInvasive ? '#7e22ce' : '#064e3b'};color:white;font-size:11px;font-weight:800;
            cursor:pointer;letter-spacing:.04em;">
            ${isInvasive ? (removed ? 'Ver Registo →' : '⚠ Ver Invasora →') : 'Ver Análise →'}
          </button>
        </div>
      </div>`;

    container.querySelector(`#popup-btn-${item.id}`)?.addEventListener('click', () => {
      onSelect(item);
    });

    return container;
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Centro de Portugal como default
    const defaultCenter: [number, number] = [39.6, -8.0];
    const defaultZoom = 6;

    const map = L.map(containerRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Atualiza pins sempre que o histórico muda
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove layers antigos (menos o tile layer)
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    if (itemsWithCoords.length === 0) return;

    const bounds: [number, number][] = [];

    itemsWithCoords.forEach(item => {
      const { latitude, longitude } = item.coords!;
      const isInvasive = item.isInvasive ?? false;
      const removed    = isInvasive && !!item.removedAt;
      const icon = createMarkerIcon(item.status, isInvasive, removed);
      const marker = L.marker([latitude, longitude], { icon }).addTo(map);

      const popup = buildPopup(item, onSelectItem);
      marker.bindPopup(popup, { maxWidth: 240, minWidth: 220 });

      bounds.push([latitude, longitude]);
    });

    // Centra o mapa nos pins
    if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40], maxZoom: 14 });
    }
  }, [itemsWithCoords, buildPopup, onSelectItem]);

  if (itemsWithCoords.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-[#064E3B]">Mapa de Campo</h2>
          <p className="text-xs text-emerald-600/50 font-medium mt-0.5">Distribuição geoespacial dos diagnósticos</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-dashed border-emerald-200 gap-4">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
            <MapPin className="w-8 h-8 text-emerald-200" />
          </div>
          <p className="text-emerald-900 font-bold">Sem diagnósticos no mapa</p>
          <p className="text-emerald-600/70 text-sm text-center px-8 leading-relaxed">
            Faz diagnósticos no campo com o GPS ativo e os pins vão aparecer aqui automaticamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-[#064E3B]">Mapa de Campo</h2>
          <p className="text-xs text-emerald-600/50 font-medium mt-0.5">
            {itemsWithCoords.length} diagnóstico{itemsWithCoords.length !== 1 ? 's' : ''} com localização GPS
          </p>
        </div>
        {/* Legenda */}
        <div className="flex flex-col gap-1">
          {[
            STATUS_CONFIG.HEALTHY,
            STATUS_CONFIG.THIRSTY,
            STATUS_CONFIG.SICK,
            STATUS_CONFIG.INVASIVE,
            STATUS_CONFIG.REMOVED,
          ].map((cfg) => (
            <div key={cfg.label} className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-700/60">
              <span>{cfg.emoji}</span>
              <span>{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full rounded-[2rem] overflow-hidden shadow-lg border border-emerald-100"
        style={{ height: '60vh', minHeight: 340 }}
      />

      <p className="text-center text-[10px] text-emerald-500/50 font-medium">
        Clica num pin para ver os detalhes do diagnóstico
      </p>
    </div>
  );
};

export default MapView;
