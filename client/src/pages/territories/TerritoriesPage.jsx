import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { Plus, MapPin, Filter, X } from 'lucide-react';

const PIN_CATEGORIES = ['general', 'priority', 'event', 'issue', 'resource'];

const createIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

export default function TerritoriesPage() {
  const { hasMinRole } = useAuth();
  const qc = useQueryClient();
  const [filterCategory, setFilterCategory] = useState('');
  const [selectedPin, setSelectedPin] = useState(null);
  const [newPinPos, setNewPinPos] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'general', color: '#3B82F6' });

  const { data: pins = [], isLoading } = useQuery({
    queryKey: ['pins', filterCategory],
    queryFn: () => api.get(`/territories/pins${filterCategory ? `?category=${filterCategory}` : ''}`),
  });

  const createPin = useMutation({
    mutationFn: (data) => api.post('/territories/pins', data),
    onSuccess: () => { qc.invalidateQueries(['pins']); setShowPinModal(false); setNewPinPos(null); },
  });

  const handleMapClick = (latlng) => {
    if (!hasMinRole('AREA_MANAGER')) return;
    setNewPinPos(latlng);
    setShowPinModal(true);
  };

  const categoryColors = { general: '#3B82F6', priority: '#EF4444', event: '#10B981', issue: '#F59E0B', resource: '#8B5CF6' };

  if (isLoading) return <LoadingSpinner centered />;

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Territories & Map</h1>
          <p className="text-sm text-gray-500">{pins.length} pins on map</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            <Filter size={13} className="text-gray-500 ml-1" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-transparent text-sm text-gray-400 focus:outline-none pr-2 py-1"
            >
              <option value="">All</option>
              {PIN_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {hasMinRole('AREA_MANAGER') && (
            <span className="text-xs text-gray-500">Click map to add pin</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 rounded-xl overflow-hidden" style={{ height: '600px' }}>
          <MapContainer center={[20, 0]} zoom={3} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            />
            <MapClickHandler onMapClick={handleMapClick} />
            {pins.map((pin) => (
              <Marker
                key={pin.id}
                position={[pin.lat, pin.lng]}
                icon={createIcon(pin.color || categoryColors[pin.category] || '#3B82F6')}
                eventHandlers={{ click: () => setSelectedPin(pin) }}
              >
                <Popup>
                  <div className="text-gray-900">
                    <strong>{pin.title}</strong>
                    {pin.description && <p className="text-xs mt-1">{pin.description}</p>}
                    <span className="inline-block text-xs bg-gray-100 rounded px-1.5 py-0.5 mt-1">{pin.category}</span>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="space-y-3 overflow-y-auto" style={{ maxHeight: '600px' }}>
          {selectedPin ? (
            <div className="card">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-200">{selectedPin.title}</h3>
                <button onClick={() => setSelectedPin(null)} className="text-gray-500 hover:text-gray-300"><X size={14} /></button>
              </div>
              {selectedPin.description && <p className="text-sm text-gray-400 mb-3">{selectedPin.description}</p>}
              <div className="space-y-2 text-xs text-gray-500">
                <div>Category: <span className="text-gray-300">{selectedPin.category}</span></div>
                <div>Lat: {selectedPin.lat.toFixed(4)}, Lng: {selectedPin.lng.toFixed(4)}</div>
                {selectedPin.users?.length > 0 && (
                  <div>Assigned: {selectedPin.users.map((u) => u.user.name).join(', ')}</div>
                )}
                {selectedPin.surveys?.length > 0 && (
                  <div>Surveys: {selectedPin.surveys.map((s) => s.survey.title).join(', ')}</div>
                )}
              </div>
            </div>
          ) : (
            <div className="card text-center text-gray-500 text-sm py-8">
              <MapPin size={20} className="mx-auto mb-2 opacity-40" />
              Click a pin for details
            </div>
          )}

          <div className="card">
            <h3 className="text-sm font-medium text-gray-300 mb-3">All Pins ({pins.length})</h3>
            <div className="space-y-2">
              {pins.slice(0, 20).map((pin) => (
                <button key={pin.id} onClick={() => setSelectedPin(pin)}
                  className="w-full flex items-center gap-2 text-left hover:bg-gray-800 rounded-lg p-2 -mx-2 transition-colors">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: pin.color || categoryColors[pin.category] }} />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-300 truncate">{pin.title}</p>
                    <p className="text-xs text-gray-600">{pin.category}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal open={showPinModal} onClose={() => { setShowPinModal(false); setNewPinPos(null); }} title="Add Map Pin">
        <form onSubmit={(e) => { e.preventDefault(); createPin.mutate({ ...form, lat: newPinPos?.lat, lng: newPinPos?.lng }); }} className="space-y-4">
          {newPinPos && (
            <div className="text-xs text-gray-500 bg-gray-800 rounded-lg p-2">
              Position: {newPinPos.lat.toFixed(4)}, {newPinPos.lng.toFixed(4)}
            </div>
          )}
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, color: categoryColors[e.target.value] || '#3B82F6' })}>
              {PIN_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowPinModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={createPin.isPending}>
              {createPin.isPending ? 'Adding...' : 'Add Pin'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
