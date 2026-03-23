import { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents } from 'react-leaflet';
import { Smartphone, MapPin, Camera, CheckCircle, Upload, Navigation } from 'lucide-react';

interface FieldInput {
  actionTitle: string;
  municipality: string;
  executedDate: string;
  executedTime: string;
  peopleCount: string;
  observations: string;
  result: string;
  lat?: number;
  lng?: number;
}

function LocationPicker({ onLocationPick }: { onLocationPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onLocationPick(e.latlng.lat, e.latlng.lng)
  });
  return null;
}

export default function Campo() {
  const [step, setStep] = useState<'form' | 'map' | 'photo' | 'confirm'>('form');
  const [input, setInput] = useState<FieldInput>({
    actionTitle: '',
    municipality: '',
    executedDate: new Date().toISOString().split('T')[0],
    executedTime: new Date().toTimeString().slice(0, 5),
    peopleCount: '',
    observations: '',
    result: '',
  });
  const [markedLocation, setMarkedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const update = (key: keyof FieldInput, value: string) => setInput(prev => ({ ...prev, [key]: value }));

  const simulateGPS = () => {
    const lat = -25.4244 + (Math.random() - 0.5) * 2;
    const lng = -49.2654 + (Math.random() - 0.5) * 4;
    setMarkedLocation({ lat, lng });
  };

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setStep('form');
    setInput({ actionTitle: '', municipality: '', executedDate: new Date().toISOString().split('T')[0], executedTime: new Date().toTimeString().slice(0, 5), peopleCount: '', observations: '', result: '' });
    setMarkedLocation(null);
    setPhotos([]);
  };

  if (submitted) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-brand-green/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-brand-green" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Ação Registrada!</h2>
          <p className="text-muted-foreground text-sm">Sua execução foi enviada para o sistema.</p>
          <p className="text-xs text-muted-foreground mt-1">Localização e evidências enviadas com sucesso.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <Smartphone className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-base font-bold text-foreground">Registro de Campo</h1>
            <p className="text-xs text-muted-foreground">Input de execução — Interface simplificada</p>
          </div>
        </div>
        {/* Steps */}
        <div className="flex gap-2 mt-3">
          {[
            { id: 'form', label: '1. Dados' },
            { id: 'map', label: '2. Localização' },
            { id: 'photo', label: '3. Evidências' },
            { id: 'confirm', label: '4. Enviar' },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setStep(s.id as any)}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${step === s.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {step === 'form' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-sm font-semibold text-foreground">Dados da Execução</h2>
            {[
              { key: 'actionTitle', label: 'Título / Nome da Ação *', placeholder: 'Ex: Panfletagem Centro de Curitiba' },
              { key: 'municipality', label: 'Município *', placeholder: 'Ex: Curitiba' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-muted-foreground block mb-1">{f.label}</label>
                <input
                  value={(input as any)[f.key]}
                  onChange={e => update(f.key as any, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Data de Execução</label>
                <input type="date" value={input.executedDate} onChange={e => update('executedDate', e.target.value)} className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Horário Real</label>
                <input type="time" value={input.executedTime} onChange={e => update('executedTime', e.target.value)} className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Pessoas Impactadas (estimativa) *</label>
              <input
                type="number"
                value={input.peopleCount}
                onChange={e => update('peopleCount', e.target.value)}
                placeholder="Ex: 500"
                className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Resultado Percebido</label>
              <select value={input.result} onChange={e => update('result', e.target.value)} className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione...</option>
                <option>Ótimo — Alta receptividade</option>
                <option>Bom — Boa receptividade</option>
                <option>Regular — Receptividade moderada</option>
                <option>Fraco — Baixa receptividade</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Observações</label>
              <textarea
                value={input.observations}
                onChange={e => update('observations', e.target.value)}
                placeholder="Descreva como foi a ação, situações relevantes..."
                rows={3}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <button
              onClick={() => setStep('map')}
              className="w-full h-12 rounded-xl font-semibold text-sm text-white"
              style={{ background: 'var(--gradient-primary)' }}
            >
              Próximo: Marcar Localização →
            </button>
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Localização da Ação</h2>
              {markedLocation && (
                <span className="text-xs text-brand-green font-semibold">✓ Localização marcada</span>
              )}
            </div>
            <button
              onClick={simulateGPS}
              className="w-full h-11 rounded-xl border border-primary/30 bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors"
            >
              <Navigation className="w-4 h-4" />
              Usar minha localização atual (GPS)
            </button>
            <div className="text-xs text-center text-muted-foreground">— ou clique no mapa para marcar manualmente —</div>
            <div className="rounded-xl overflow-hidden border border-border" style={{ height: 300 }}>
              <MapContainer
                center={markedLocation ? [markedLocation.lat, markedLocation.lng] : [-24.7, -51.5]}
                zoom={markedLocation ? 13 : 7}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                <LocationPicker onLocationPick={(lat, lng) => setMarkedLocation({ lat, lng })} />
                {markedLocation && (
                  <CircleMarker
                    center={[markedLocation.lat, markedLocation.lng]}
                    radius={12}
                    fillColor="#22c55e"
                    color="#ffffff"
                    weight={2}
                    fillOpacity={0.9}
                  >
                    <Popup>
                      <strong>Localização da ação</strong><br />
                      Lat: {markedLocation.lat.toFixed(6)}<br />
                      Lng: {markedLocation.lng.toFixed(6)}
                    </Popup>
                  </CircleMarker>
                )}
              </MapContainer>
            </div>
            {markedLocation && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-brand-green/10 border border-brand-green/20">
                <MapPin className="w-4 h-4 text-brand-green" />
                <span className="text-xs text-brand-green font-medium">
                  {markedLocation.lat.toFixed(6)}, {markedLocation.lng.toFixed(6)}
                </span>
              </div>
            )}
            <button onClick={() => setStep('photo')} className="w-full h-12 rounded-xl font-semibold text-sm text-white" style={{ background: 'var(--gradient-primary)' }}>
              Próximo: Adicionar Evidências →
            </button>
          </div>
        )}

        {step === 'photo' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-sm font-semibold text-foreground">Evidências Fotográficas</h2>
            <p className="text-xs text-muted-foreground">Adicione fotos que comprovem a realização da ação.</p>
            {/* Simulated photo cards */}
            <div className="grid grid-cols-2 gap-3">
              {photos.map((p, i) => (
                <div key={i} className="aspect-square rounded-xl bg-muted border border-border flex items-center justify-center relative overflow-hidden">
                  <img src={p} alt={`Evidência ${i + 1}`} className="w-full h-full object-cover" />
                  <button onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white text-xs">✕</button>
                </div>
              ))}
              <button
                onClick={() => setPhotos([...photos, `https://picsum.photos/200/200?random=${Date.now()}`])}
                className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <Camera className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Adicionar foto</span>
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">Clique em "Adicionar foto" para simular upload de evidência</p>
            <button onClick={() => setStep('confirm')} className="w-full h-12 rounded-xl font-semibold text-sm text-white" style={{ background: 'var(--gradient-primary)' }}>
              Próximo: Confirmar Envio →
            </button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-sm font-semibold text-foreground">Confirmar Registro</h2>
            <div className="rounded-xl border border-border p-4 space-y-3" style={{ background: 'var(--gradient-card)' }}>
              {[
                { label: 'Ação', value: input.actionTitle || '(não informado)' },
                { label: 'Município', value: input.municipality || '(não informado)' },
                { label: 'Data/Hora', value: `${input.executedDate} às ${input.executedTime}` },
                { label: 'Pessoas Impactadas', value: input.peopleCount ? `~${parseInt(input.peopleCount).toLocaleString()}` : '(não informado)' },
                { label: 'Resultado', value: input.result || '(não informado)' },
                { label: 'Localização', value: markedLocation ? `${markedLocation.lat.toFixed(4)}, ${markedLocation.lng.toFixed(4)}` : 'Não marcada' },
                { label: 'Evidências', value: `${photos.length} foto(s)` },
              ].map(item => (
                <div key={item.label} className="flex items-start justify-between gap-4">
                  <span className="text-xs text-muted-foreground flex-shrink-0">{item.label}</span>
                  <span className="text-xs font-medium text-foreground text-right">{item.value}</span>
                </div>
              ))}
            </div>
            {input.observations && (
              <div className="rounded-xl border border-border p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground mb-1">Observações:</div>
                <div className="text-xs text-foreground">{input.observations}</div>
              </div>
            )}
            <button
              onClick={handleSubmit}
              className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, hsl(142 72% 45%), hsl(142 72% 38%))' }}
            >
              <CheckCircle className="w-5 h-5" />
              Confirmar e Enviar Registro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
