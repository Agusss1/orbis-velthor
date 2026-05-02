import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import { Upload, FileText, Download, Tag, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const MIME_ICONS = { 'application/pdf': '📄', 'image/': '🖼️', 'video/': '🎬', 'text/': '📝', default: '📎' };

function getMimeIcon(mime = '') {
  return Object.entries(MIME_ICONS).find(([k]) => mime.startsWith(k))?.[1] || MIME_ICONS.default;
}

export default function DocumentsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ title: '', description: '', tags: '' });
  const [file, setFile] = useState(null);
  const fileRef = useRef();

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents', search],
    queryFn: () => api.get(`/documents${search ? `?search=${search}` : ''}`),
  });

  const { data: areas = [] } = useQuery({ queryKey: ['areas'], queryFn: () => api.get('/areas') });

  const upload = useMutation({
    mutationFn: (formData) => api.post('/documents', formData),
    onSuccess: () => { qc.invalidateQueries(['documents']); setShowModal(false); setFile(null); setForm({ title: '', description: '', tags: '' }); },
  });

  const handleUpload = (e) => {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', form.title || file.name);
    fd.append('description', form.description);
    fd.append('tags', JSON.stringify(form.tags.split(',').map((t) => t.trim()).filter(Boolean)));
    upload.mutate(fd);
  };

  if (isLoading) return <LoadingSpinner centered />;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Documents</h1>
          <p className="text-sm text-gray-500">{docs.length} documents</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Upload size={16} /> Upload</button>
      </div>

      <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 max-w-sm">
        <Search size={14} className="text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents..."
          className="bg-transparent text-sm text-gray-300 placeholder-gray-500 focus:outline-none flex-1"
        />
      </div>

      {docs.length === 0 ? (
        <EmptyState icon={FileText} title="No documents" description="Upload your first document." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((doc) => (
            <div key={doc.id} className="card group">
              <div className="flex items-start gap-3">
                <div className="text-2xl">{getMimeIcon(doc.mimeType)}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-200 truncate">{doc.title}</h3>
                  {doc.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{doc.description}</p>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {doc.tags?.map((tag) => (
                      <span key={tag} className="flex items-center gap-1 text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                        <Tag size={10} /> {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-gray-800 pt-3">
                <div className="text-xs text-gray-500">
                  <span>v{doc.version}</span>
                  <span className="mx-1">·</span>
                  <span>{(doc.size / 1024).toFixed(1)} KB</span>
                  <span className="mx-1">·</span>
                  <span>{formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}</span>
                </div>
                <a href={`/api/documents/${doc.id}/download`} className="btn-ghost text-xs py-1 px-2">
                  <Download size={13} /> Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Upload Document">
        <form onSubmit={handleUpload} className="space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${file ? 'border-orbis-500 bg-orbis-600/10' : 'border-gray-700 hover:border-gray-600'}`}
          >
            <Upload size={24} className="mx-auto mb-2 text-gray-500" />
            {file ? (
              <p className="text-sm text-orbis-400">{file.name}</p>
            ) : (
              <p className="text-sm text-gray-500">Click to select a file</p>
            )}
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
          </div>
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={file?.name || 'Document title'} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Tags (comma-separated)</label>
            <input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="legal, important, 2024" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={!file || upload.isPending}>
              {upload.isPending ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
