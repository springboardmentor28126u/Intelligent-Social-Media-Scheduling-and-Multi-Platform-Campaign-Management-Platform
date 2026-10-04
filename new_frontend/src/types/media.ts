export interface MediaItem {
  id: number;
  user_id: number;
  filename: string;
  original_filename: string;
  file_url: string;
  media_type: 'image' | 'video';
  mime_type?: string | null;
  size_bytes: number;
  created_at: string;
}

export interface MediaListResponse {
  items: MediaItem[];
  total: number;
  total_size_bytes: number;
}

export type MediaFilterType = 'all' | 'image' | 'video';
export type MediaSortOption = 'newest' | 'oldest' | 'size_desc' | 'size_asc' | 'name';
