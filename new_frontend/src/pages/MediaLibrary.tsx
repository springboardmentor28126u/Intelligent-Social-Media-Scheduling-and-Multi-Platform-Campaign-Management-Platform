import { useState, useEffect, useRef } from 'react';
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
  X,
  Download,
  Eye,
  HardDrive,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import { Skeleton } from '@/components/common/Skeleton';
import type { MediaItem, MediaFilterType, MediaSortOption } from '@/types/media';
import { getMediaList, uploadMediaFile, deleteMediaItem, resolveMediaUrl, handleMediaError } from '@/services/media';

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

  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [totalSize, setTotalSize] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<MediaFilterType>('all');
  const [sortOption, setSortOption] = useState<MediaSortOption>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Modal states
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<MediaItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getMediaList({
        media_type: filterType,
        search: searchQuery,
        sort: sortOption,
      });
      setMediaList(data.items || []);
      setTotalSize(data.total_size_bytes || 0);
    } catch (err: any) {
      console.error('Failed to fetch media:', err);
      setUploadError(err.message || 'Failed to load media files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [filterType, sortOption]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMedia();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleFileUpload = async (file: File) => {
    if (!token) {
      setUploadError('You must be logged in to upload media files.');
      return;
    }

    const allowedExts = [
      '.mp4', '.mov', '.avi', '.webm',
      '.jpg', '.jpeg', '.png', '.gif', '.webp'
    ];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExts.includes(ext)) {
      setUploadError(`Unsupported file type "${ext}". Allowed: images (.jpg, .png, .webp, .gif) and videos (.mp4, .mov, .avi, .webm)`);
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      setUploadError('File exceeds maximum size limit of 200MB.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setSuccessMessage(null);

    try {
      const newItem = await uploadMediaFile(file);
      setMediaList((prev) => [newItem, ...prev]);
      setTotalSize((prev) => prev + newItem.size_bytes);
      setSuccessMessage(`"${file.name}" uploaded successfully!`);
      setTimeout(() => setSuccessMessage(null), 4000);
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
    navigate('/app/create', { state: { initialMediaUrl: url, initialVideoUrl: url } });
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setDeletingId(itemToDelete.id);
    try {
      await deleteMediaItem(itemToDelete.id);
      setMediaList((prev) => prev.filter((m) => m.id !== itemToDelete.id));
      setTotalSize((prev) => Math.max(0, prev - itemToDelete.size_bytes));
      setSuccessMessage('Media file deleted successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
      if (previewItem?.id === itemToDelete.id) {
        setPreviewItem(null);
      }
    } catch (err: any) {
      console.error('Failed to delete media:', err);
      setUploadError(err.message || 'Failed to delete media file');
    } finally {
      setDeletingId(null);
      setItemToDelete(null);
    }
  };

  const imageCount = mediaList.filter((m) => m.media_type === 'image').length;
  const videoCount = mediaList.filter((m) => m.media_type === 'video').length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
      {/* Header */}
      <PageHeader
        title="Media Library"
        description="Organize, preview, and manage your images and videos across all social campaigns."
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              leftIcon={uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            >
              {uploading ? 'Uploading...' : 'Upload Media'}
            </Button>
          </div>
        }
      />

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/*,video/*,.mp4,.mov,.avi,.webm,.jpg,.jpeg,.png,.gif,.webp"
        className="hidden"
        disabled={uploading}
      />

      {/* Alerts */}
      {uploadError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0 text-danger-600" />
            <span>{uploadError}</span>
          </div>
          <button onClick={() => setUploadError(null)} className="text-danger-500 hover:text-danger-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-success-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-success-500 hover:text-success-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Storage Overview & Dropzone Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`lg:col-span-2 flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-8 px-6 transition-all ${
            isDragging
              ? 'border-brand-500 bg-brand-50/70 ring-4 ring-brand-500/10'
              : 'border-ink-200 bg-white/70 hover:border-brand-400 hover:bg-brand-50/20'
          } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-soft">
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            ) : (
              <Upload className="h-6 w-6 text-brand-600" />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-ink-900">
              {uploading ? 'Uploading media to server...' : 'Drag & drop media files here, or browse from computer'}
            </p>
            <p className="mt-1 text-xs text-ink-400">
              Supports JPG, PNG, WEBP, GIF, MP4, MOV, AVI, WEBM up to 200MB
            </p>
          </div>
        </div>

        {/* Storage Summary Card */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-100 text-ink-700">
                  <HardDrive className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-semibold text-ink-900">Storage Overview</h4>
              </div>
              <Badge variant="brand">{formatBytes(totalSize)}</Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-ink-50 p-3">
                <div className="flex items-center gap-1.5 text-xs text-ink-500 font-medium">
                  <ImageIcon className="h-3.5 w-3.5 text-brand-600" />
                  Images
                </div>
                <p className="mt-1 text-lg font-bold text-ink-900">{imageCount}</p>
              </div>
              <div className="rounded-xl bg-ink-50 p-3">
                <div className="flex items-center gap-1.5 text-xs text-ink-500 font-medium">
                  <Film className="h-3.5 w-3.5 text-purple-600" />
                  Videos
                </div>
                <p className="mt-1 text-lg font-bold text-ink-900">{videoCount}</p>
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-ink-400">
            Total of <span className="font-semibold text-ink-700">{mediaList.length} files</span> stored in your library.
          </p>
        </Card>
      </div>

      {/* Toolbar: Filter Tabs, Search, Sort & View Mode */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { key: 'all', label: 'All Files', count: mediaList.length },
              { key: 'image', label: 'Images', count: imageCount },
              { key: 'video', label: 'Videos', count: videoCount },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
                filterType === tab.key
                  ? 'bg-ink-900 text-white shadow-sm'
                  : 'text-ink-600 hover:bg-ink-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  filterType === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-ink-200/60 text-ink-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search, Sort & View toggles */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search filename..."
              className="w-full rounded-xl border border-ink-100 bg-white py-2 pl-9 pr-3 text-sm text-ink-700 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as MediaSortOption)}
              className="rounded-xl border border-ink-100 bg-white py-2 px-3 text-sm text-ink-700 transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="size_desc">Largest Size</option>
              <option value="size_asc">Smallest Size</option>
              <option value="name">File Name A-Z</option>
            </select>

            <div className="flex items-center rounded-lg border border-ink-200 bg-white p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-all ${
                  viewMode === 'grid' ? 'bg-ink-100 text-ink-900 font-semibold' : 'text-ink-400 hover:text-ink-700'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-all ${
                  viewMode === 'list' ? 'bg-ink-100 text-ink-900 font-semibold' : 'text-ink-400 hover:text-ink-700'
                }`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-4 space-y-3">
              <Skeleton className="h-44 w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </Card>
          ))}
        </div>
      ) : mediaList.length === 0 ? (
        <Card className="border-dashed p-10">
          <EmptyState
            icon={<ImageIcon className="h-10 w-10 text-ink-400" />}
            title={searchQuery ? 'No media files match your query' : 'Your media library is empty'}
            description={
              searchQuery
                ? `Try adjusting your search query "${searchQuery}" or filter options.`
                : 'Upload creative assets, videos, and graphics to attach them directly to your multi-platform campaigns.'
            }
            action={
              <Button
                variant="primary"
                size="md"
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<Upload className="h-4 w-4" />}
              >
                Upload First File
              </Button>
            }
          />
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {mediaList.map((item) => (
            <Card
              key={item.id}
              className="group overflow-hidden flex flex-col justify-between transition-all hover:shadow-card hover:border-ink-300"
            >
              <div>
                {/* Media Preview Thumbnail */}
                <div
                  onClick={() => setPreviewItem(item)}
                  className="relative aspect-video w-full bg-ink-950 flex items-center justify-center overflow-hidden cursor-pointer"
                >
                  {item.media_type === 'image' ? (
                    <img
                      src={resolveMediaUrl(item.file_url)}
                      alt={item.original_filename}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => handleMediaError(e, item.file_url)}
                    />
                  ) : (
                    <div className="relative h-full w-full flex items-center justify-center bg-ink-900">
                      <video
                        src={resolveMediaUrl(item.file_url)}
                        className="h-full w-full object-cover opacity-80"
                        preload="metadata"
                        onError={(e) => handleMediaError(e, item.file_url)}
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-ink-900 shadow-md transition-transform group-hover:scale-110">
                          <Film className="h-5 w-5 text-brand-600" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Badges on preview */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-black/60 backdrop-blur-md px-2 py-0.5 text-[11px] font-medium text-white">
                      {item.media_type === 'image' ? (
                        <ImageIcon className="h-3 w-3 text-brand-400" />
                      ) : (
                        <Film className="h-3 w-3 text-purple-400" />
                      )}
                      {item.media_type.toUpperCase()}
                    </span>
                  </div>

                  <div className="absolute top-2.5 right-2.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewItem(item);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/70 text-white hover:bg-black/90 transition-colors"
                      title="Quick Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Metadata */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm font-semibold text-ink-900 truncate"
                        title={item.original_filename}
                      >
                        {item.original_filename}
                      </p>
                      <p className="mt-1 text-xs text-ink-400 flex items-center gap-1.5">
                        <span>{formatBytes(item.size_bytes)}</span>
                        <span>•</span>
                        <span>
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'Uploaded'}
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() => setItemToDelete(item)}
                      className="text-ink-400 hover:text-danger-600 transition-colors p-1.5 rounded-lg hover:bg-danger-50"
                      title="Delete file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="border-t border-ink-100 p-3 bg-ink-50/50 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleCopyLink(item.file_url)}
                  leftIcon={
                    copiedUrl === item.file_url ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )
                  }
                >
                  {copiedUrl === item.file_url ? 'Copied' : 'Copy URL'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleUseInPost(item.file_url)}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Use in Post
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* List Mode */
        <Card className="overflow-hidden divide-y divide-ink-100">
          {mediaList.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 transition-colors hover:bg-ink-50/40"
            >
              <div
                className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                onClick={() => setPreviewItem(item)}
              >
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-ink-100 overflow-hidden">
                  {item.media_type === 'image' ? (
                    <img
                      src={resolveMediaUrl(item.file_url)}
                      alt={item.original_filename}
                      className="h-full w-full object-cover"
                      onError={(e) => handleMediaError(e, item.file_url)}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-purple-100 text-purple-700">
                      <Film className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900 truncate">
                    {item.original_filename}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-400">
                    <Badge variant={item.media_type === 'image' ? 'brand' : 'neutral'} size="sm">
                      {item.media_type.toUpperCase()}
                    </Badge>
                    <span>{formatBytes(item.size_bytes)}</span>
                    <span>•</span>
                    <span>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Uploaded'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyLink(item.file_url)}
                  leftIcon={
                    copiedUrl === item.file_url ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )
                  }
                >
                  {copiedUrl === item.file_url ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleUseInPost(item.file_url)}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Use in Post
                </Button>
                <button
                  onClick={() => setItemToDelete(item)}
                  className="text-ink-400 hover:text-danger-600 transition-colors p-2 rounded-lg hover:bg-danger-50"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
              <div className="min-w-0 flex-1 pr-4">
                <h3 className="text-base font-semibold text-ink-900 truncate">
                  {previewItem.original_filename}
                </h3>
                <p className="text-xs text-ink-400">
                  {formatBytes(previewItem.size_bytes)} • {previewItem.media_type.toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 bg-ink-950 flex items-center justify-center overflow-hidden min-h-[320px] max-h-[550px]">
              {previewItem.media_type === 'image' ? (
                <img
                  src={resolveMediaUrl(previewItem.file_url)}
                  alt={previewItem.original_filename}
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => handleMediaError(e, previewItem.file_url)}
                />
              ) : (
                <video
                  src={resolveMediaUrl(previewItem.file_url)}
                  controls
                  autoPlay
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => handleMediaError(e, previewItem.file_url)}
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between border-t border-ink-100 bg-ink-50 px-6 py-4 gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyLink(previewItem.file_url)}
                  leftIcon={
                    copiedUrl === previewItem.file_url ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )
                  }
                >
                  {copiedUrl === previewItem.file_url ? 'Copied URL' : 'Copy URL'}
                </Button>
                <a
                  href={previewItem.file_url}
                  download={previewItem.original_filename}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex"
                >
                  <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />}>
                    Download
                  </Button>
                </a>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setItemToDelete(previewItem);
                  }}
                  leftIcon={<Trash2 className="h-4 w-4" />}
                >
                  Delete
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleUseInPost(previewItem.file_url)}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Use in Post
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-danger-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-50">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-ink-900">Delete Media File</h3>
            </div>
            <p className="text-sm text-ink-600">
              Are you sure you want to permanently delete{' '}
              <span className="font-semibold text-ink-900">{itemToDelete.original_filename}</span>?
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setItemToDelete(null)}
                disabled={Boolean(deletingId)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={confirmDelete}
                disabled={Boolean(deletingId)}
                leftIcon={deletingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              >
                {deletingId ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
