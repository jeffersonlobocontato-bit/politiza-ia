import { useMemo, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin } from 'lucide-react';

interface Interview {
  id: string;
  round_id: string;
  municipality: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  respondent_gender: string | null;
  respondent_age_range: string | null;
  respondent_income: string | null;
  respondent_education: string | null;
}

interface Round {
  id: string;
  title: string;
  city: string | null;
}

interface Props {
  interviews: Interview[];
  rounds: Round[];
  selectedRoundId: string | null;
  onRoundChange: (id: string | null) => void;
}

// Dynamic import Leaflet
let L: any = null;

export function TrackingMap({ interviews, rounds, selectedRoundId, onRoundChange }: Props) {
  const [mapReady, setMapReady] = useState(false);

  const filtered = useMemo(() => {
    let items = interviews.filter(i => i.lat != null && i.lng != null);
    if (selectedRoundId) items = items.filter(i => i.round_id === selectedRoundId);
    return items;
  }, [interviews, selectedRoundId]);

  useEffect(() => {
    // Load leaflet dynamically
    const loadLeaflet = async () => {
      if (typeof window === 'undefined') return;
      const leaflet = await import('leaflet');
      L = leaflet.default || leaflet;

      // Fix default icon
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      setMapReady(true);
    };
    loadLeaflet();
  }, []);

  useEffect(() => {
    if (!mapReady || !L) return;

    const container = document.getElementById('tracking-map');
    if (!container) return;

    // Clean up existing map
    if ((container as any)._leafletMap) {
      (container as any)._leafletMap.remove();
    }

    const center = filtered.length > 0
      ? [filtered.reduce((s, i) => s + i.lat!, 0) / filtered.length, filtered.reduce((s, i) => s + i.lng!, 0) / filtered.length]
      : [-25.4284, -49.2733]; // Curitiba default

    const map = L.map(container).setView(center as [number, number], filtered.length > 0 ? 10 : 7);
    (container as any)._leafletMap = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    // Add markers with clustering effect via circle markers
    filtered.forEach(interview => {
      const marker = L.circleMarker([interview.lat!, interview.lng!], {
        radius: 8,
        fillColor: 'hsl(217, 91%, 60%)',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      }).addTo(map);

      const gender = interview.respondent_gender || '—';
      const age = interview.respondent_age_range || '—';
      const income = interview.respondent_income || '—';
      const education = interview.respondent_education || '—';

      const popupContent = `
        <div style="font-size:12px;background:hsl(220,20%,13%);color:#c8d6e5;padding:10px 12px;border-radius:8px;min-width:180px;border:1px solid hsl(220,15%,22%);margin:-14px -20px;">
          <div style="font-weight:700;color:#0FFCBE;margin-bottom:6px;font-size:13px;">📍 ${interview.municipality || 'Local'}</div>
          <div style="display:flex;flex-direction:column;gap:3px;">
            <span>👤 ${gender}</span>
            <span>🎂 ${age}</span>
            <span>💰 ${income}</span>
            <span>🎓 ${education}</span>
          </div>
          <div style="margin-top:6px;padding-top:5px;border-top:1px solid hsl(220,15%,25%);font-size:10px;color:#8899aa;">
            📅 ${new Date(interview.created_at).toLocaleString('pt-BR')}<br/>
            ${interview.lat?.toFixed(5)}, ${interview.lng?.toFixed(5)}
          </div>
        </div>
      `;

      const popup = L.popup({ closeButton: false, offset: [0, -6], className: 'tracking-tooltip-clean' })
        .setContent(popupContent);

      marker.on('mouseover', function(e: any) {
        popup.setLatLng(e.latlng);
        map.openPopup(popup);
      });
      marker.on('mouseout', function() {
        map.closePopup(popup);
      });
    });

    // Simple heatmap via overlapping circles with low opacity
    if (filtered.length > 10) {
      filtered.forEach(interview => {
        L.circle([interview.lat!, interview.lng!], {
          radius: 1500,
          fillColor: 'hsl(217, 91%, 60%)',
          color: 'transparent',
          fillOpacity: 0.05,
        }).addTo(map);
      });
    }

    return () => {
      map.remove();
      (container as any)._leafletMap = null;
    };
  }, [mapReady, filtered]);

  const gpsCount = filtered.length;
  const manualCount = (selectedRoundId
    ? interviews.filter(i => i.round_id === selectedRoundId)
    : interviews
  ).filter(i => i.lat == null || i.lng == null).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedRoundId || 'all'} onValueChange={v => onRoundChange(v === 'all' ? null : v)}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Todas as rodadas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as rodadas</SelectItem>
            {rounds.map(r => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-xs gap-1">
          <MapPin className="w-3 h-3" /> {gpsCount} GPS
        </Badge>
        {manualCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {manualCount} sem GPS
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div id="tracking-map" className="h-[500px] w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  );
}
