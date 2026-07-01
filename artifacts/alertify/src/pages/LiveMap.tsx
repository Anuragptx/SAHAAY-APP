import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { subscribeToAlerts, type Alert, type AlertCategory } from '../lib/firebase';
import { getCurrentPosition, distanceKm, formatCoords, timeRemaining, type Coords } from '../lib/geo';
import { getSessionId } from '../lib/session';

// Category config
const CAT_CONFIG: Record<AlertCategory, { color: string; icon: string; label: string }> = {
  Medical:        { color: '#dc2626', icon: '🏥', label: 'Medical Emergency' },
  Safety:         { color: '#2563eb', icon: '🛡️', label: 'Safety Alert' },
  'Technical Help': { color: '#ca8a04', icon: '🔧', label: 'Technical/Mechanical' },
};

interface PopupState {
  alert: Alert;
  distKm: number;
}

interface LiveMapProps {
  activeAlertId?: string;
  onOpenChat: (alertId: string, category: AlertCategory, expiresAt: Date | null) => void;
}

export default function LiveMap({ activeAlertId, onOpenChat }: LiveMapProps) {
  const mapRef       = useRef<L.Map | null>(null);
  const mapDivRef    = useRef<HTMLDivElement>(null);
  const markersRef   = useRef<Map<string, L.Marker>>(new Map());
  const circleRef    = useRef<L.Circle | null>(null);

  const [myCoords, setMyCoords]   = useState<Coords | null>(null);
  const [gpsOk, setGpsOk]         = useState(false);
  const [gpsError, setGpsError]   = useState<string | null>(null);
  const [alerts, setAlerts]        = useState<Alert[]>([]);
  const [popup, setPopup]          = useState<PopupState | null>(null);
  const [tick, setTick]            = useState(0); // for timer re-renders

  // Countdown tick every second
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Initialise map
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    const map = L.map(mapDivRef.current, {
      center: [20.5937, 78.9629], // Centre of India as fallback
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Try to center on user's position
    getCurrentPosition()
      .then((coords) => {
        setMyCoords(coords);
        setGpsOk(true);
        setGpsError(null);
        map.setView([coords.lat, coords.lng], 14);

        // User marker
        const userIcon = L.divIcon({
          html: `<div style="width:14px;height:14px;background:#004ed0;border:2px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(0,78,208,0.25)"></div>`,
          className: '',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        L.marker([coords.lat, coords.lng], { icon: userIcon })
          .addTo(map)
          .bindPopup('<b style="font-family:Inter">📍 You are here</b>');

        // 2km radius circle
        const circle = L.circle([coords.lat, coords.lng], {
          radius: 2000,
          color: '#004ed0',
          fillColor: '#004ed0',
          fillOpacity: 0.05,
          weight: 1.5,
          dashArray: '6 4',
        }).addTo(map);
        circleRef.current = circle;
      })
      .catch((err: GeolocationPositionError | Error) => {
        setGpsOk(false);
        const code = (err as GeolocationPositionError).code;
        if (code === 1 /* PERMISSION_DENIED */) {
          setGpsError('Location access denied. Enable GPS in your browser to see nearby alerts.');
        } else if (code === 2 /* POSITION_UNAVAILABLE */) {
          setGpsError('GPS signal unavailable. Showing all active alerts instead.');
        } else {
          setGpsError('Could not determine your location. Showing all active alerts.');
        }
      });

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Build a Leaflet DivIcon for an alert marker
  const makeMarkerIcon = useCallback((cat: AlertCategory) => {
    const { color, icon } = CAT_CONFIG[cat];
    return L.divIcon({
      html: `
        <div style="
          width:40px;height:40px;
          background:${color};
          border-radius:50% 50% 50% 0;
          border:2px solid white;
          box-shadow:0 2px 10px rgba(0,0,0,0.25);
          transform:rotate(-45deg);
          display:flex;align-items:center;justify-content:center;
        ">
          <span style="transform:rotate(45deg);font-size:16px;line-height:1;">${icon}</span>
        </div>
        <div style="width:12px;height:4px;background:rgba(0,0,0,0.2);border-radius:50%;margin:1px auto 0;filter:blur(2px);"></div>
      `,
      className: '',
      iconSize: [40, 46],
      iconAnchor: [20, 46],
    });
  }, []);

  // Sync Firestore alerts to map markers — only show alerts within 2km radius.
  // If we don't have the user's position yet, fall back to showing all alerts.
  useEffect(() => {
    const RADIUS_KM = 2;
    const unsub = subscribeToAlerts((liveAlerts) => {
      setAlerts(liveAlerts);
      const map = mapRef.current;
      if (!map) return;

      // Filter to 2km when we have user coords; otherwise show all
      const visible = myCoords
        ? liveAlerts.filter(
            (a) => distanceKm(myCoords, { lat: a.lat, lng: a.lng }) <= RADIUS_KM,
          )
        : liveAlerts;

      const seen = new Set<string>();

      visible.forEach((alert) => {
        if (!alert.id) return;
        seen.add(alert.id);
        if (!markersRef.current.has(alert.id)) {
          const icon = makeMarkerIcon(alert.category);
          const marker = L.marker([alert.lat, alert.lng], { icon }).addTo(map);
          marker.on('click', () => {
            const dist = myCoords ? distanceKm(myCoords, { lat: alert.lat, lng: alert.lng }) : 0;
            setPopup({ alert, distKm: dist });
          });
          markersRef.current.set(alert.id, marker);
        }
      });

      // Remove markers for alerts that are no longer visible (expired or out of range)
      markersRef.current.forEach((marker, id) => {
        if (!seen.has(id)) {
          marker.remove();
          markersRef.current.delete(id);
        }
      });

      // Auto-open popup for the alert we just broadcast
      if (activeAlertId) {
        const found = visible.find((a) => a.id === activeAlertId);
        if (found) {
          const dist = myCoords ? distanceKm(myCoords, { lat: found.lat, lng: found.lng }) : 0;
          setPopup({ alert: found, distKm: dist });
        }
      }
    });
    return unsub;
  }, [makeMarkerIcon, myCoords, activeAlertId]);

  const centerOnMe = () => {
    if (myCoords && mapRef.current) {
      mapRef.current.setView([myCoords.lat, myCoords.lng], 15);
    }
  };

  const nearbyCount = alerts.filter((a) =>
    myCoords ? distanceKm(myCoords, { lat: a.lat, lng: a.lng }) <= 2 : true,
  ).length;

  return (
    <div className="flex flex-col h-full relative bg-[#e5e3df]">
      {/* Header */}
      <header className="flex items-center justify-between px-5 h-16 bg-[#f9f9ff] border-b border-[#dce2f7] shadow-sm shrink-0 z-20">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#b70011] text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield_with_heart</span>
          <span className="text-[20px] font-black tracking-tight text-[#b70011]">Alertify</span>
        </div>
        <div className="flex items-center gap-2 bg-[#f1f3ff] border border-[#dce2f7] px-3 py-1 rounded-full">
          <div className={`w-2 h-2 rounded-full ${gpsOk ? 'bg-emerald-500' : 'bg-amber-400'} pulse-dot`} />
          <span className="text-[12px] font-semibold text-[#5c403c]">{gpsOk ? 'GPS Active' : 'Locating…'}</span>
        </div>
      </header>

      {/* Full-screen map */}
      <div className="flex-1 relative">
        <div ref={mapDivRef} id="leaflet-map" className="absolute inset-0" />

        {/* GPS denied / unavailable banner */}
        {gpsError && (
          <div className="absolute top-3 left-3 right-3 z-20 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-start gap-2 shadow-md animate-fade-in">
            <span className="material-symbols-outlined text-amber-600 text-[20px] mt-0.5 shrink-0">gps_off</span>
            <p className="text-[12px] text-amber-800 leading-relaxed">{gpsError}</p>
          </div>
        )}

        {/* Legend overlay */}
        <div className={`absolute ${gpsError ? 'top-[5.5rem]' : 'top-3'} left-3 z-10 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 border border-[#dce2f7]/60`}>
          <p className="text-[10px] font-bold text-[#5c403c] uppercase tracking-widest mb-2">Active Alerts · 2km</p>
          {Object.entries(CAT_CONFIG).map(([cat, { color, label }]) => (
            <div key={cat} className="flex items-center gap-2 mb-1.5 last:mb-0">
              <div style={{ background: color }} className="w-3.5 h-3.5 rounded-full border border-white shadow-sm flex-shrink-0" />
              <span className="text-[11px] text-[#5c403c] font-medium">{label}</span>
            </div>
          ))}
          {nearbyCount > 0 && (
            <div className="mt-2 pt-2 border-t border-[#dce2f7]">
              <span className="text-[11px] font-bold text-[#b70011]">{nearbyCount} active nearby</span>
            </div>
          )}
        </div>

        {/* Re-centre button */}
        <button
          onClick={centerOnMe}
          className="absolute bottom-4 right-4 z-10 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-[#b70011] border border-[#dce2f7] hover:bg-[#f1f3ff] transition-colors"
        >
          <span className="material-symbols-outlined text-[24px]">my_location</span>
        </button>

        {/* Alert popup */}
        {popup && (
          <div className="absolute bottom-6 left-3 right-3 z-20 animate-fade-in">
            <div className={`bg-white rounded-xl shadow-2xl border-l-[5px] overflow-hidden`}
              style={{ borderLeftColor: CAT_CONFIG[popup.alert.category].color }}>
              <div className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <span
                    className="text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: CAT_CONFIG[popup.alert.category].color }}
                  >
                    {popup.alert.category}
                  </span>
                  <div className="flex items-center gap-1">
                    {popup.alert.expiresAt && (
                      <span className="text-[10px] text-[#b70011] font-bold bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="material-symbols-outlined text-[11px]">timer</span>
                        {timeRemaining(popup.alert.expiresAt.toDate())}
                      </span>
                    )}
                    <button
                      onClick={() => setPopup(null)}
                      className="ml-1 text-[#5c403c] hover:text-[#141b2b] p-0.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                </div>

                <p className="text-[16px] font-bold text-[#141b2b] leading-snug">
                  {CAT_CONFIG[popup.alert.category].label}
                </p>
                <p className="text-[13px] text-[#5c403c] mt-0.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">near_me</span>
                  {popup.distKm > 0 ? `${popup.distKm.toFixed(1)} km away` : 'Location acquired'}
                </p>
                {myCoords && (
                  <p className="text-[11px] font-mono text-[#916f6b] mt-0.5">
                    {formatCoords(popup.alert.lat, popup.alert.lng)}
                  </p>
                )}

                {/* Only show "I can help" if it's not our own alert */}
                {popup.alert.sessionId !== getSessionId() ? (
                  <button
                    onClick={() => {
                      if (popup.alert.id) onOpenChat(popup.alert.id, popup.alert.category, popup.alert.expiresAt?.toDate() ?? null);
                    }}
                    className="mt-3 w-full bg-[#dc2626] text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>volunteer_activism</span>
                    I CAN HELP
                  </button>
                ) : (
                  <div className="mt-3 w-full bg-[#f1f3ff] text-[#5c403c] font-bold py-3 rounded-lg flex items-center justify-center gap-2 text-[14px]">
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>how_to_reg</span>
                    Your active alert
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
