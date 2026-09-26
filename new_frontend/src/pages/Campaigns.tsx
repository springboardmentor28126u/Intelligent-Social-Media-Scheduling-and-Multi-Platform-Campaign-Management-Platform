import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  FolderKanban,
  Search,
  LayoutGrid,
  List as ListIcon,
  Calendar,
  DollarSign,
  Target,
  Edit2,
  Trash2,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Clock,
  Send,
  PenSquare,
  FileText,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Sparkles,
  X,
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import EmptyState from '@/components/common/EmptyState';
import Badge from '@/components/common/Badge';
import { PlatformIcon } from '@/components/common/PlatformIcons';
import {
  type CampaignOut,
  type CampaignCreate,
  type CampaignUpdate,
  type CampaignStatus,
  getCampaignStatusBadgeVariant,
  formatCurrency,
  formatDateRange,
} from '@/types/campaign';
import {
  type PostOut,
  backendPlatformToKey,
  getPostStatusBadgeVariant,
  formatDateTime,
} from '@/types/post';
import {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignPosts,
} from '@/services/campaigns';

const filterTabs: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Paused', value: 'paused' },
  { label: 'Completed', value: 'completed' },
];

const goalPresets = [
  'Brand Awareness',
  'Lead Generation',
  'Product Launch',
  'Community Engagement',
  'Website Traffic',
  'Holiday Promotion',
];

export default function Campaigns() {
  const navigate = useNavigate();
  const location = useLocation();

  // Core list state
  const [campaigns, setCampaigns] = useState<CampaignOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Selected Campaign Detail state
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(() => {
    const state = location.state as { selectedCampaignId?: number } | undefined;
    return state?.selectedCampaignId || null;
  });
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignOut | null>(null);
  const [campaignPosts, setCampaignPosts] = useState<PostOut[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);

  // Create / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingCampaignId, setEditingCampaignId] = useState<number | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    goal: string;
    budget: string;
    start_date: string;
    end_date: string;
    status: CampaignStatus;
  }>({
    name: '',
    description: '',
    goal: '',
    budget: '',
    start_date: '',
    end_date: '',
    status: 'active',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation state
  const [deletingCampaign, setDeletingCampaign] = useState<CampaignOut | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load campaigns
  const fetchCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCampaigns();
      setCampaigns(data);

      // If we have a selected campaign, refresh its reference
      if (selectedCampaignId) {
        const found = data.find((c) => c.id === selectedCampaignId);
        if (found) {
          setSelectedCampaign(found);
        }
      }
    } catch (err: any) {
      console.error('Failed to load campaigns:', err);
      setError(err.message || 'Failed to load campaigns. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Fetch campaign posts when a campaign is selected
  useEffect(() => {
    if (!selectedCampaignId) {
      setSelectedCampaign(null);
      setCampaignPosts([]);
      return;
    }

    const loadDetailAndPosts = async () => {
      setLoadingPosts(true);
      setPostsError(null);
      try {
        const [detail, posts] = await Promise.all([
          getCampaign(selectedCampaignId),
          getCampaignPosts(selectedCampaignId),
        ]);
        setSelectedCampaign(detail);
        setCampaignPosts(posts);
      } catch (err: any) {
        console.error('Failed to load campaign details/posts:', err);
        setPostsError(err.message || 'Failed to load campaign details.');
      } finally {
        setLoadingPosts(false);
      }
    };

    loadDetailAndPosts();
  }, [selectedCampaignId]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingCampaignId(null);
    setFormData({
      name: '',
      description: '',
      goal: '',
      budget: '',
      start_date: '',
      end_date: '',
      status: 'active',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (campaign: CampaignOut, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setModalMode('edit');
    setEditingCampaignId(campaign.id);
    setFormData({
      name: campaign.name || '',
      description: campaign.description || '',
      goal: campaign.goal || '',
      budget: campaign.budget !== null && campaign.budget !== undefined ? String(campaign.budget) : '',
      start_date: campaign.start_date ? campaign.start_date.split('T')[0] : '',
      end_date: campaign.end_date ? campaign.end_date.split('T')[0] : '',
      status: campaign.status || 'draft',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Submit Create or Edit Form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Campaign name is required.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    const parsedBudget = formData.budget.trim() ? parseFloat(formData.budget) : null;
    if (formData.budget.trim() && isNaN(parsedBudget!)) {
      setFormError('Budget must be a valid number.');
      setFormSubmitting(false);
      return;
    }

    const payload: CampaignCreate = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      goal: formData.goal.trim() || null,
      budget: parsedBudget,
      start_date: formData.start_date ? `${formData.start_date}T00:00:00` : null,
      end_date: formData.end_date ? `${formData.end_date}T23:59:59` : null,
      status: formData.status,
    };

    try {
      if (modalMode === 'create') {
        const newCampaign = await createCampaign(payload);
        setCampaigns((prev) => [newCampaign, ...prev]);
        setIsModalOpen(false);
      } else if (modalMode === 'edit' && editingCampaignId) {
        const updated = await updateCampaign(editingCampaignId, payload);
        setCampaigns((prev) =>
          prev.map((c) => (c.id === editingCampaignId ? updated : c))
        );
        if (selectedCampaign?.id === editingCampaignId) {
          setSelectedCampaign(updated);
        }
        setIsModalOpen(false);
      }
    } catch (err: any) {
      console.error('Error saving campaign:', err);
      setFormError(err.message || 'Failed to save campaign.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Confirm and Execute Delete
  const handleDeleteClick = (campaign: CampaignOut, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeletingCampaign(campaign);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCampaign) return;
    setIsDeleting(true);
    try {
      await deleteCampaign(deletingCampaign.id);
      setCampaigns((prev) => prev.filter((c) => c.id !== deletingCampaign.id));
      if (selectedCampaignId === deletingCampaign.id) {
        setSelectedCampaignId(null);
        setSelectedCampaign(null);
      }
      setDeletingCampaign(null);
    } catch (err: any) {
      console.error('Error deleting campaign:', err);
      alert(err.message || 'Failed to delete campaign.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter campaigns
  const filteredCampaigns = campaigns.filter((c) => {
    const matchesFilter =
      activeFilter === 'all' || c.status?.toLowerCase() === activeFilter.toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      c.name?.toLowerCase().includes(query) ||
      c.description?.toLowerCase().includes(query) ||
      c.goal?.toLowerCase().includes(query);
    return matchesFilter && matchesQuery;
  });

  // Render Campaign Detail View if a campaign is selected
  if (selectedCampaignId && selectedCampaign) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
        {/* Breadcrumb / Back button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedCampaignId(null)}
            className="group flex items-center gap-2 text-sm font-medium text-ink-600 transition-colors hover:text-ink-900"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 bg-white transition-colors group-hover:bg-ink-100">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span>Back to all campaigns</span>
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => handleOpenEditModal(selectedCampaign, e)}
              leftIcon={<Edit2 className="h-3.5 w-3.5" />}
            >
              Edit Campaign
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => handleDeleteClick(selectedCampaign, e)}
              className="text-danger-600 hover:bg-danger-50 hover:border-danger-200"
              leftIcon={<Trash2 className="h-3.5 w-3.5 text-danger-600" />}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Campaign Banner Header */}
        <Card className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
                  {selectedCampaign.name}
                </h1>
                <Badge
                  variant={getCampaignStatusBadgeVariant(selectedCampaign.status)}
                  size="md"
                  dot
                  className="capitalize"
                >
                  {selectedCampaign.status}
                </Badge>
              </div>
              {selectedCampaign.description && (
                <p className="text-sm text-ink-600 max-w-3xl leading-relaxed">
                  {selectedCampaign.description}
                </p>
              )}
            </div>

            <Button
              variant="secondary"
              size="md"
              onClick={() =>
                navigate('/app/create', {
                  state: { initialCampaignId: selectedCampaign.id },
                })
              }
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Create Post for Campaign
            </Button>
          </div>

          {/* Quick Metrics Grid */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-6 border-t border-ink-100">
            <div className="rounded-xl bg-ink-50/60 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                <Target className="h-3.5 w-3.5 text-brand-600" />
                <span>Goal</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-ink-900 truncate">
                {selectedCampaign.goal || 'Not specified'}
              </p>
            </div>

            <div className="rounded-xl bg-ink-50/60 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                <DollarSign className="h-3.5 w-3.5 text-success-600" />
                <span>Budget</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-ink-900">
                {selectedCampaign.budget !== null && selectedCampaign.budget !== undefined
                  ? formatCurrency(selectedCampaign.budget)
                  : 'Unset'}
              </p>
            </div>

            <div className="rounded-xl bg-ink-50/60 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                <Calendar className="h-3.5 w-3.5 text-ink-500" />
                <span>Date Range</span>
              </div>
              <p className="mt-1 text-xs font-semibold text-ink-900">
                {formatDateRange(selectedCampaign.start_date, selectedCampaign.end_date)}
              </p>
            </div>

            <div className="rounded-xl bg-ink-50/60 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                <FileText className="h-3.5 w-3.5 text-accent-600" />
                <span>Total Posts</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-ink-900">
                {campaignPosts.length} {campaignPosts.length === 1 ? 'post' : 'posts'}
              </p>
            </div>
          </div>
        </Card>

        {/* Assigned Posts Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink-900">Campaign Posts</h2>
              <p className="text-xs text-ink-500">
                All social media posts assigned to this campaign.
              </p>
            </div>
            {campaignPosts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate('/app/create', {
                    state: { initialCampaignId: selectedCampaign.id },
                  })
                }
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                Add Post
              </Button>
            )}
          </div>

          {loadingPosts ? (
            <Card className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
                <p className="text-sm text-ink-500">Loading campaign posts...</p>
              </div>
            </Card>
          ) : postsError ? (
            <Card className="p-6 border-danger-200 bg-danger-50/50">
              <div className="flex items-center gap-3 text-danger-700">
                <AlertCircle className="h-5 w-5 shrink-0 text-danger-600" />
                <p className="text-sm font-medium">{postsError}</p>
              </div>
            </Card>
          ) : campaignPosts.length === 0 ? (
            <Card className="border-dashed p-8">
              <EmptyState
                icon={<FolderKanban className="h-7 w-7" />}
                title="No posts in this campaign yet"
                description="Assign existing posts or create new content targeted for this campaign's goals."
                action={
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() =>
                      navigate('/app/create', {
                        state: { initialCampaignId: selectedCampaign.id },
                      })
                    }
                    leftIcon={<Plus className="h-4 w-4" />}
                  >
                    Create First Post
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {campaignPosts.map((post) => {
                const isDraft = post.status.toLowerCase() === 'draft';
                const isScheduled = post.status.toLowerCase() === 'scheduled';
                const isPublished = post.status.toLowerCase() === 'published';

                return (
                  <Card
                    key={post.id}
                    hover
                    className="flex flex-col justify-between p-5 transition-all"
                  >
                    <div className="space-y-3">
                      {/* Post Header: Status + Platforms */}
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={getPostStatusBadgeVariant(post.status)}
                          dot
                          size="sm"
                          className="capitalize"
                        >
                          {post.status}
                        </Badge>

                        <div className="flex items-center -space-x-1">
                          {post.platform_posts && post.platform_posts.length > 0 ? (
                            post.platform_posts.map((pp) => (
                              <div
                                key={pp.id}
                                className="flex h-6 w-6 items-center justify-center rounded-full border border-white bg-ink-100 shadow-xs"
                                title={`${pp.platform} (${pp.status})`}
                              >
                                <PlatformIcon
                                  platform={backendPlatformToKey(pp.platform)}
                                  className="h-3.5 w-3.5"
                                />
                              </div>
                            ))
                          ) : (
                            <span className="text-[11px] text-ink-400">No channels</span>
                          )}
                        </div>
                      </div>

                      {/* Post Title & Content Preview */}
                      <div>
                        {post.title && (
                          <h4 className="text-sm font-semibold text-ink-900 line-clamp-1 mb-1">
                            {post.title}
                          </h4>
                        )}
                        <p className="text-sm text-ink-600 line-clamp-3 leading-relaxed">
                          {post.content}
                        </p>
                      </div>

                      {/* Media preview thumbnail if attached */}
                      {post.media_urls && post.media_urls.length > 0 && (
                        <div className="relative h-28 w-full overflow-hidden rounded-lg bg-ink-100">
                          {post.media_urls[0].match(/\.(mp4|mov|avi|webm)($|\?)/i) ? (
                            <video
                              src={post.media_urls[0]}
                              className="h-full w-full object-cover"
                              muted
                            />
                          ) : (
                            <img
                              src={post.media_urls[0]}
                              alt="Post media"
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Post Footer info and action */}
                    <div className="mt-4 pt-3 border-t border-ink-100 flex items-center justify-between text-xs text-ink-500">
                      <div className="flex items-center gap-1.5 truncate">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                        <span className="truncate">
                          {post.scheduled_time
                            ? formatDateTime(post.scheduled_time)
                            : `Created ${formatDateTime(post.created_at)}`}
                        </span>
                      </div>

                      <button
                        onClick={() => navigate('/app/create', { state: { editPost: post } })}
                        className="flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                      >
                        <PenSquare className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Edit Modal (reusable) */}
        {isModalOpen && renderModal()}

        {/* Delete Confirmation Dialog */}
        {deletingCampaign && renderDeleteDialog()}
      </div>
    );
  }

  // Render Campaigns List View
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader
        title="Campaigns"
        description="Organize, schedule, and track multi-channel social media initiatives."
        action={
          <Button
            variant="secondary"
            size="md"
            onClick={handleOpenCreateModal}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Create Campaign
          </Button>
        }
      />

      {/* Toolbar: Filters, Search, and View switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
          {filterTabs.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
                activeFilter === f.value
                  ? 'bg-ink-900 text-white shadow-xs'
                  : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
              }`}
            >
              {f.label}
              {f.value !== 'all' && (
                <span className="ml-1.5 text-xs opacity-70">
                  (
                  {campaigns.filter((c) => c.status?.toLowerCase() === f.value).length}
                  )
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-ink-200 bg-white py-2 pl-9 pr-4 text-sm text-ink-800 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
            />
          </div>

          <div className="flex items-center rounded-xl border border-ink-200 bg-white p-1 shadow-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-ink-100 text-ink-900 font-semibold' : 'text-ink-400 hover:text-ink-700'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-ink-100 text-ink-900 font-semibold' : 'text-ink-400 hover:text-ink-700'
              }`}
              title="List view"
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Global Error Alert */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <AlertCircle className="h-5 w-5 shrink-0 text-danger-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="p-6 space-y-4 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-5 w-20 bg-ink-200 rounded-full" />
                <div className="h-4 w-12 bg-ink-100 rounded" />
              </div>
              <div className="h-6 w-3/4 bg-ink-200 rounded" />
              <div className="h-4 w-full bg-ink-100 rounded" />
              <div className="h-4 w-2/3 bg-ink-100 rounded" />
              <div className="pt-4 border-t border-ink-100 flex justify-between">
                <div className="h-4 w-24 bg-ink-200 rounded" />
                <div className="h-4 w-16 bg-ink-200 rounded" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <Card className="border-dashed p-8">
          <EmptyState
            icon={<FolderKanban className="h-7 w-7" />}
            title={
              searchQuery || activeFilter !== 'all'
                ? 'No matching campaigns'
                : 'No campaigns created yet'
            }
            description={
              searchQuery || activeFilter !== 'all'
                ? 'Try adjusting your search query or filter criteria.'
                : 'Create your first campaign to group posts, allocate budget, and track performance.'
            }
            action={
              <Button
                variant="secondary"
                size="md"
                onClick={handleOpenCreateModal}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Create Campaign
              </Button>
            }
          />
        </Card>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCampaigns.map((campaign) => (
            <Card
              key={campaign.id}
              hover
              onClick={() => setSelectedCampaignId(campaign.id)}
              className="cursor-pointer flex flex-col justify-between p-6 transition-all hover:border-brand-300"
            >
              <div className="space-y-3">
                {/* Status & Quick Actions */}
                <div className="flex items-center justify-between">
                  <Badge
                    variant={getCampaignStatusBadgeVariant(campaign.status)}
                    dot
                    size="sm"
                    className="capitalize"
                  >
                    {campaign.status}
                  </Badge>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleOpenEditModal(campaign, e)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                      title="Edit Campaign"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(campaign, e)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
                      title="Delete Campaign"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Campaign Name & Description */}
                <div>
                  <h3 className="text-base font-bold text-ink-900 group-hover:text-brand-600 line-clamp-1">
                    {campaign.name}
                  </h3>
                  <p className="mt-1 text-xs text-ink-500 line-clamp-2 leading-relaxed">
                    {campaign.description || 'No description provided.'}
                  </p>
                </div>

                {/* Goal Tag */}
                {campaign.goal && (
                  <div className="flex items-center gap-1.5 text-xs text-ink-600">
                    <Target className="h-3.5 w-3.5 text-brand-600 shrink-0" />
                    <span className="truncate font-medium">{campaign.goal}</span>
                  </div>
                )}
              </div>

              {/* Bottom Details */}
              <div className="mt-5 pt-4 border-t border-ink-100 flex items-center justify-between text-xs text-ink-500">
                <div className="flex items-center gap-1.5 font-medium">
                  <Calendar className="h-3.5 w-3.5 text-ink-400 shrink-0" />
                  <span className="truncate">
                    {formatDateRange(campaign.start_date, campaign.end_date)}
                  </span>
                </div>

                <div className="font-semibold text-ink-900">
                  {campaign.budget !== null && campaign.budget !== undefined
                    ? formatCurrency(campaign.budget)
                    : 'Unset'}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* Table List View */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-100 bg-ink-50/60 text-xs font-semibold uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-6 py-3.5">Campaign</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Goal</th>
                  <th className="px-6 py-3.5">Date Range</th>
                  <th className="px-6 py-3.5">Budget</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filteredCampaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    onClick={() => setSelectedCampaignId(campaign.id)}
                    className="cursor-pointer transition-colors hover:bg-ink-50/60"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-ink-900">{campaign.name}</div>
                      {campaign.description && (
                        <div className="text-xs text-ink-400 line-clamp-1 max-w-xs">
                          {campaign.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={getCampaignStatusBadgeVariant(campaign.status)}
                        dot
                        size="sm"
                        className="capitalize"
                      >
                        {campaign.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-ink-700">
                      {campaign.goal || '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-ink-600 whitespace-nowrap">
                      {formatDateRange(campaign.start_date, campaign.end_date)}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-ink-900 whitespace-nowrap">
                      {campaign.budget !== null && campaign.budget !== undefined
                        ? formatCurrency(campaign.budget)
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => handleOpenEditModal(campaign, e)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(campaign, e)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create / Edit Campaign Modal */}
      {isModalOpen && renderModal()}

      {/* Delete Confirmation Modal */}
      {deletingCampaign && renderDeleteDialog()}
    </div>
  );

  // Modal Render Function
  function renderModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-ink-100 my-8">
          <div className="flex items-center justify-between border-b border-ink-100 pb-4 mb-5">
            <div>
              <h3 className="text-lg font-bold text-ink-900">
                {modalMode === 'create' ? 'Create New Campaign' : 'Edit Campaign'}
              </h3>
              <p className="text-xs text-ink-500 mt-0.5">
                {modalMode === 'create'
                  ? 'Organize posts and set target metrics for your upcoming campaign.'
                  : 'Update campaign details, schedule, or status.'}
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {formError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-danger-200 bg-danger-50 p-3 text-xs text-danger-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-danger-600" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Campaign Name */}
            <div>
              <label className="text-xs font-semibold text-ink-700">
                Campaign Name <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Summer Launch 2026, Q3 Hiring Drive"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full mt-1.5 rounded-xl border border-ink-200 bg-ink-50/40 px-3.5 py-2.5 text-sm text-ink-800 placeholder:text-ink-400 focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 focus:outline-none transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-ink-700">Description</label>
              <textarea
                rows={2}
                placeholder="Brief summary of the campaign objective..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full mt-1.5 rounded-xl border border-ink-200 bg-ink-50/40 px-3.5 py-2 text-sm text-ink-800 placeholder:text-ink-400 focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 focus:outline-none resize-none transition-all"
              />
            </div>

            {/* Goal presets & input */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-ink-700">Primary Goal</label>
                <span className="text-[11px] text-ink-400">Select preset or type custom</span>
              </div>
              <input
                type="text"
                placeholder="e.g. Brand Awareness, Lead Generation"
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                className="w-full mt-1.5 rounded-xl border border-ink-200 bg-ink-50/40 px-3.5 py-2 text-sm text-ink-800 placeholder:text-ink-400 focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 focus:outline-none transition-all"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {goalPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFormData({ ...formData, goal: preset })}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                      formData.goal === preset
                        ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-300'
                        : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget & Status row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-ink-700">Budget (USD)</label>
                <div className="relative mt-1.5">
                  <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="500.00"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full rounded-xl border border-ink-200 bg-ink-50/40 py-2 pl-9 pr-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as CampaignStatus })
                  }
                  className="w-full mt-1.5 rounded-xl border border-ink-200 bg-ink-50/40 px-3.5 py-2 text-sm text-ink-800 focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 focus:outline-none transition-all"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            {/* Start and End Dates */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-ink-700">Start Date</label>
                <div className="relative mt-1.5">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full rounded-xl border border-ink-200 bg-ink-50/40 py-2 pl-9 pr-3 text-sm text-ink-800 focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-700">End Date</label>
                <div className="relative mt-1.5">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full rounded-xl border border-ink-200 bg-ink-50/40 py-2 pl-9 pr-3 text-sm text-ink-800 focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-ink-100 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setIsModalOpen(false)}
                disabled={formSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={formSubmitting}
                leftIcon={
                  formSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : modalMode === 'create' ? (
                    <Plus className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )
                }
              >
                {formSubmitting
                  ? 'Saving...'
                  : modalMode === 'create'
                  ? 'Create Campaign'
                  : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Delete Dialog Render Function
  function renderDeleteDialog() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 backdrop-blur-sm p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-ink-100">
          <div className="flex items-center gap-3 text-danger-600 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-50 border border-danger-100">
              <Trash2 className="h-5 w-5 text-danger-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink-900">Delete Campaign</h3>
              <p className="text-xs text-ink-500">This action cannot be undone.</p>
            </div>
          </div>

          <p className="text-sm text-ink-600 leading-relaxed mb-5">
            Are you sure you want to delete{' '}
            <strong className="text-ink-900">"{deletingCampaign?.name}"</strong>? Posts
            currently assigned to this campaign will remain intact but will be unassigned.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-ink-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setDeletingCampaign(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              leftIcon={
                isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )
              }
            >
              {isDeleting ? 'Deleting...' : 'Delete Campaign'}
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
