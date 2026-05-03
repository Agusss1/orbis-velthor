import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Plus, X, Layers, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { territoriesApi } from '../api';
import Modal from '../components/ui/Modal';
import { PageSpinner } from '../components/ui/Spinner';
import useAuthStore from '../store/authStore';

const PIN_CATEGORIES = ['general', 'event', 'issue', 'resource', 'contact', 'infrastructure'];

function createPinIcon(color = '#EF4444') {
  return L.divIcon({
    html: `<div style="width:24px;height:24px;background:${color};border:2px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });
}

function NewPinModal({ isOpen, onClose, coordinates }) {
  const qc = useQueryClient();
  const { data: territoriesData } = useQuery({ queryKey: ['territories'], queryFn: () => territoriesApi.list() });
  const territories = territoriesData?.data?.data || [];
  const [form, setForm] = useState({ title: '', description: '', category: 'general', color: '#EF4444', territory_id: '' });

  const mutation = useMutation({
    mutationFn: () => territoriesApi.createPin({
      ...form,
      latitude: coordinates?.lat,
      longitude: coordinates?.lng,
    }),
    onSuccess: () => { qc.invalidateQueries(['pins']); toast.success('Pin added'); onClose(); setForm({ title: '', description: '', category: 'general', color: '#EF4444', territory_id: '' }); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Pin">
      <div className="space-y-4">
        <div className="text-xs text-gray-500 bg-gray-800 px-3 py-2 rounded-lg">
          📍 {coordinates?.lat?.toFixed(6)}, {coordinates?.lng?.toFixed(6)}
        </div>
        <div>
          <label className="label">Title *</label>
          <input className="input-base" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Pin title" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Category</label>
            <select className="input-base" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {PIN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Territory</label>
            <select className="input-base" value={form.territory_id} onChange={(e) => setForm({ ...form, territory_id: e.target.value })}>
              <option value="">None</option>
              {territories.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Color</label>
          <div className="flex gap-2">
            {['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'].map(c => (
              <button key={c} onClick={() => setForm({ ...form, color: c })}
                className={`w-8 h-8 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input-base resize-none" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="flex gap-3 pt-2">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1 justify-center" onClick={() => mutation.mutate()} disabled={!form.title || mutation.isPending}>
            Add Pin
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PinDetailPanel({ pin, onClose }) {
  if (!pin) return null;
  return (
    <div className="absolute top-4 right-4 w-72 card p-4 shadow-2xl z-[1000]">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">{pin.title}</h3>
          <span className="badge bg-gray-700/50 text-gray-400 text-[10px] mt-1">{pin.category}</span>
        </div>
        <button onClick={onClose} className="p-1 text-gray-600 hover:text-gray-300">
          <X className="w-4 h-4" />
        </button>
      </div>
      {pin.description && <p className="text-xs text-gray-500 mb-3">{pin.description}</p>}
      {pin.territory_name && <p className="text-xs text-gray-500"><Layers className="w-3 h-3 inline mr-1" />{pin.territory_name}</p>}
      {(pin.assignees || []).length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <p className="text-[10px] text-gray-600 uppercase mb-2">Assignees</p>
          {pin.assignees.map(a => (
            <div key={a.id} className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 text-[10px] font-bold">{a.full_name?.charAt(0)}</div>
              <span className="text-xs text-gray-400">{a.full_name}</span>
            </div>
          ))}
        </div>
      )}
      {(pin.notes || []).length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <p className="text-[10px] text-gray-600 uppercase mb-2">Notes ({pin.note_count})</p>
        </div>
      )}
    </div>
  );
}

function MapClickHandler({ onMapClick, adding }) {
  useMapEvents({
    click: (e) => adding && onMapClick(e.latlng),
  });
  return null;
}

export default function MapView() {
  const [adding, setAdding] = useState(false);
  const [coords, setCoords] = useState(null);
  const [selectedPin, setSelectedPin] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const { hasRole } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['pins', categoryFilter],
    queryFn: () => territoriesApi.listPins({ category: categoryFilter || undefined }),
  });
  const pins = data?.data?.data || [];

  const canAdd = hasRole('owner', 'super_admin', 'political_coordinator', 'area_manager');

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="h-14 flex items-center justify-between px-6 border-b border-gray-800 bg-gray-950/80 shrink-0">
        <h2 className="text-base font-semibold text-gray-100">Map & Territories</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select className="input-base py-1 text-xs w-36" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All categories</option>
              {PIN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {canAdd && (
            <button
              className={adding ? 'btn-danger' : 'btn-primary'}
              onClick={() => setAdding(!adding)}
            >
              {adding ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Pin</>}
            </button>
          )}
        </div>
      </div>

      {adding && (
        <div className="px-6 py-2 bg-brand-600/10 border-b border-brand-600/20 text-sm text-brand-400">
          Click anywhere on the map to place a pin
        </div>
      )}

      <div className="flex-1 relative">
        <MapContainer
          center={[-34.6037, -58.3816]}
          zoom={11}
          className="w-full h-full"
          style={{ zIndex: 0 }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <MapClickHandler adding={adding} onMapClick={(latlng) => { setCoords(latlng); }} />

          {pins.map(pin => (
            <Marker
              key={pin.id}
              position={[parseFloat(pin.latitude), parseFloat(pin.longitude)]}
              icon={createPinIcon(pin.color)}
              eventHandlers={{ click: () => setSelectedPin(pin) }}
            >
              <Popup className="!bg-transparent !border-0">
                <div className="bg-gray-800 rounded-lg p-2 text-xs text-gray-200 font-medium">
                  {pin.title}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {selectedPin && <PinDetailPanel pin={selectedPin} onClose={() => setSelectedPin(null)} />}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 card p-3 z-[1000] text-xs">
          <p className="text-gray-500 mb-2">{pins.length} pins</p>
          {PIN_CATEGORIES.slice(0, 4).map(c => (
            <div key={c} className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-brand-500" />
              <span className="text-gray-500 capitalize">{c}</span>
            </div>
          ))}
        </div>
      </div>

      <NewPinModal
        isOpen={!!coords}
        onClose={() => { setCoords(null); setAdding(false); }}
        coordinates={coords}
      />
    </div>
  );
}
