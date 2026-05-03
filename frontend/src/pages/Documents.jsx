import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, Download, Tag, Search, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { documentsApi, areasApi } from '../api';
import Header from '../components/layout/Header';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { PageSpinner } from '../components/ui/Spinner';
import { format } from 'date-fns';
import useAuthStore from '../store/authStore';

const MIME_ICONS = {
  'application/pdf': '📄',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  default: '📁',
};

function DocCard({ doc, onDownload }) {
  const icon = MIME_ICONS[doc.mime_type] || MIME_ICONS.default;
  const sizeKB = doc.file_size ? (doc.file_size / 1024).toFixed(0) + ' KB' : '';
  return (
    <div className="card p-4 hover:border-gray-600 transition-colors">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-200 truncate">{doc.title}</h3>
          <p className="text-xs text-gray-500">{doc.file_name}</p>
        </div>
        <button onClick={() => onDownload(doc)} className="p-1.5 text-gray-600 hover:text-brand-400 transition-colors rounded-lg hover:bg-gray-800">
          <Download className="w-4 h-4" />
        </button>
      </div>
      {doc.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{doc.description}</p>}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {(doc.tags || []).map(tag => (
          <span key={tag} className="badge bg-gray-700/50 text-gray-400 text-[10px]">
            <Tag className="w-2.5 h-2.5 mr-1" />{tag}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-800">
        <span>v{doc.current_version} · {sizeKB}</span>
        <span>{doc.area_name || 'No area'}</span>
        <span>{doc.last_updated ? format(new Date(doc.last_updated), 'MMM d, yyyy') : ''}</span>
      </div>
    </div>
  );
}

function UploadModal({ isOpen, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', description: '', area_id: '', tags: '' });
  const [file, setFile] = useState(null);
  const { data: areasData } = useQuery({ queryKey: ['areas'], queryFn: () => areasApi.list({ limit: 100 }) });
  const areas = areasData?.data?.data || [];

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', form.title);
      fd.append('description', form.description);
      if (form.area_id) fd.append('area_id', form.area_id);
      if (form.tags) fd.append('tags', form.tags);
      return documentsApi.create(fd);
    },
    onSuccess: () => { qc.invalidateQueries(['documents']); toast.success('Document uploaded'); onClose(); setFile(null); setForm({ title: '', description: '', area_id: '', tags: '' }); },
    onError: (err) => toast.error(err.response?.data?.error || 'Upload failed'),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Document">
      <div className="space-y-4">
        <div>
          <label className="label">Title *</label>
          <input className="input-base" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Document title" />
        </div>
        <div>
          <label className="label">File *</label>
          <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center cursor-pointer hover:border-gray-600 transition-colors" onClick={() => document.getElementById('doc-file').click()}>
            <Upload className="w-6 h-6 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">{file ? file.name : 'Click to select file (PDF, Word, Excel, Images)'}</p>
            <input id="doc-file" type="file" className="hidden" onChange={(e) => setFile(e.target.files[0])} accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png" />
          </div>
        </div>
        <div>
          <label className="label">Area</label>
          <select className="input-base" value={form.area_id} onChange={(e) => setForm({ ...form, area_id: e.target.value })}>
            <option value="">None</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Tags (comma-separated)</label>
          <input className="input-base" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="policy, report, 2024" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input-base resize-none" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="flex gap-3 pt-2">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1 justify-center" onClick={() => mutation.mutate()} disabled={!form.title || !file || mutation.isPending}>
            {mutation.isPending ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function Documents() {
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const { hasRole } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['documents', search, areaFilter],
    queryFn: () => documentsApi.list({ search, area_id: areaFilter || undefined, limit: 50 }),
  });

  const { data: areasData } = useQuery({ queryKey: ['areas'], queryFn: () => areasApi.list({ limit: 100 }) });
  const areas = areasData?.data?.data || [];
  const docs = data?.data?.data || [];

  const canUpload = hasRole('owner', 'super_admin', 'political_coordinator', 'area_manager', 'legislator');

  const handleDownload = (doc) => {
    window.open(`/api/documents/${doc.id}/download`, '_blank');
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Documents"
        actions={canUpload && <button className="btn-primary" onClick={() => setShowUpload(true)}><Plus className="w-4 h-4" /> Upload</button>}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-3 mb-5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input className="input-base pl-9 w-56" placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input-base w-40" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
            <option value="">All areas</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {docs.length === 0 ? (
          <EmptyState icon={FileText} title="No documents yet" description="Upload files to share with your team."
            action={canUpload && <button className="btn-primary" onClick={() => setShowUpload(true)}><Plus className="w-4 h-4" /> Upload Document</button>} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map(doc => <DocCard key={doc.id} doc={doc} onDownload={handleDownload} />)}
          </div>
        )}
      </div>

      <UploadModal isOpen={showUpload} onClose={() => setShowUpload(false)} />
    </div>
  );
}
