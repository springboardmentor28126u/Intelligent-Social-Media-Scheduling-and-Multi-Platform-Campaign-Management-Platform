export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';

export interface CampaignBase {
  name: string;
  description?: string | null;
  goal?: string | null;
  budget?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: CampaignStatus;
}

export interface CampaignCreate extends CampaignBase {}

export interface CampaignUpdate {
  name?: string;
  description?: string | null;
  goal?: string | null;
  budget?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: CampaignStatus;
}

export interface CampaignOut extends CampaignBase {
  id: number;
  user_id: number;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
}

export function getCampaignStatusBadgeVariant(
  status: string
): 'brand' | 'neutral' | 'success' | 'warning' | 'danger' {
  switch (status.toLowerCase()) {
    case 'active':
      return 'success';
    case 'draft':
      return 'neutral';
    case 'paused':
      return 'warning';
    case 'completed':
      return 'brand';
    default:
      return 'neutral';
  }
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateRange(
  startDateStr?: string | null,
  endDateStr?: string | null
): string {
  if (!startDateStr && !endDateStr) return 'No dates set';
  
  const formatDate = (dStr: string) => {
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const start = startDateStr ? formatDate(startDateStr) : null;
  const end = endDateStr ? formatDate(endDateStr) : null;

  if (start && end) return `${start} – ${end}`;
  if (start) return `From ${start}`;
  if (end) return `Until ${end}`;
  return 'No dates set';
}
