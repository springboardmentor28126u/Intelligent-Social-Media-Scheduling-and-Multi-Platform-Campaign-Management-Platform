import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Search,
  LayoutGrid,
  List,
  Image as ImageIcon,
  Loader2,
  Film,
  Copy,
  Check,
  Plus,
  Trash2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';

const API_BASE = 'http://localhost:8000';

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  size_bytes?: number;
  uploaded_at: string;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function MediaLibrary() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sessionMedia, setSessionMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!token) {
      setUploadError('You must be logged in to upload media files.');
      return;
    }

    const allowedExts = ['.mp4', '.mov', '.avi', '.webm'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExts.includes(ext)) {
      setUploadError(`Unsupported file type "${ext}". Allowed types: .mp4, .mov, .avi, .webm`);
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      setUploadError('File exceeds maximum size limit of 200MB.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/media/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setUploadError(data.detail || 'Failed to upload media file.');
        return;
      }

      const newItem: MediaItem = {
        id: Math.random().toString(36).substring(2, 9),
        url: data.url,
        filename: file.name,
        size_bytes: data.size_bytes || file.size,
        uploaded_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setSessionMedia((prev) => [newItem, ...prev]);
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setUploadError(err.message || 'An error occurred during upload.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleUseInPost = (url: string) => {
    navigate('/app/create', { state: { initialVideoUrl: url } });
  };

  const handleDeleteItem = (id: string) => {
    setSessionMedia((prev) => prev.filter((item) => item.id !== id));
  };

  const filteredMedia = sessionMedia.filter((item) =>
    item.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader
        title="Media Library"
        description="Manage your video files and creative assets for LinkedIn & YouTube posts."
        action={
          <Button
            variant="primary"
            size="md"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            leftIcon={uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          >
            {uploading ? 'Uploading...' : 'Upload Video'}
          </Button>
        }
      />

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,.mp4,.mov,.avi,.webm"
        className="hidden"
        disabled={uploading}
      />

      {uploadError && (
        <div className="flex items-center gap-3 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <AlertCircle className="h-5 w-5 shrink-0 text-danger-600" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Interactive Drag and Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-10 transition-all ${
          isDragging
            ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20'
            : 'border-ink-200 bg-ink-50/30 hover:border-brand-300 hover:bg-brand-50/30'
        } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-ink-500 shadow-soft">
          {uploading ? (
            <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
          ) : (
            <Upload className="h-7 w-7 text-brand-600" />
          )}
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-ink-800">
            {uploading ? 'Uploading video to server...' : 'Drag & drop video files here, or click to browse'}
          </p>
          <p className="mt-1 text-xs text-ink-400">Supports .mp4, .mov, .avi, .webm up to 200MB</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search uploaded media..."
              className="w-full rounded-xl border border-ink-100 bg-white py-2.5 pl-10 pr-4 text-sm text-ink-700 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="neutral" size="sm">
            {sessionMedia.length} {sessionMedia.length === 1 ? 'file' : 'files'} uploaded this session
          </Badge>
          <div className="flex items-center rounded-lg border border-ink-200 bg-white p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-all ${
                viewMode === 'grid' ? 'bg-ink-100 text-ink-900' : 'text-ink-400'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-all ${
                viewMode === 'list' ? 'bg-ink-100 text-ink-900' : 'text-ink-400'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Media Content */}
      {sessionMedia.length === 0 ? (
        <Card className="border-dashed p-8">
          <EmptyState
            icon={<ImageIcon className="h-8 w-8 text-ink-400" />}
            title="No media uploaded yet this session."
            description="Upload a video using the dropzone above to easily attach it to LinkedIn & YouTube posts."
            action={
              <Button
                variant="secondary"
                size="md"
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<Upload className="h-4 w-4" />}
              >
                Upload Video Asset
              </Button>
            }
          />
        </Card>
      ) : filteredMedia.length === 0 ? (
        <Card className="p-8 text-center text-ink-500 text-sm">
          No files match your search "{searchQuery}".
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMedia.map((item) => (
            <Card key={item.id} className="overflow-hidden flex flex-col justify-between">
              <div>
                <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
                  <video
                    src={item.url}
                    controls
                    className="h-full w-full object-contain"
                    preload="metadata"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink-900 truncate" title={item.filename}>
                        {item.filename}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        {formatBytes(item.size_bytes)} • Uploaded at {item.uploaded_at}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-ink-400 hover:text-danger-600 transition-colors p-1"
                      title="Remove from session list"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-ink-100 p-3 bg-ink-50/40 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleCopyLink(item.url)}
                  leftIcon={copiedUrl === item.url ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                >
                  {copiedUrl === item.url ? 'Copied' : 'Copy URL'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleUseInPost(item.url)}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Use in Post
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden divide-y divide-ink-100">
          {filteredMedia.map((item) => (
            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <Film className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900 truncate">{item.filename}</p>
                  <p className="text-xs text-ink-400">
                    {formatBytes(item.size_bytes)} • {item.url}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyLink(item.url)}
                  leftIcon={copiedUrl === item.url ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                >
                  {copiedUrl === item.url ? 'Copied' : 'Copy URL'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleUseInPost(item.url)}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Use in Post
                </Button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-ink-400 hover:text-danger-600 transition-colors p-2"
                  title="Remove from session list"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
