export type MediaType = 'photo' | 'video';

export interface MediaListItem {
  media_type: MediaType;
  url: string;
  name?: string;
  id?: number;
  poster?: string;
  playback_rate?: number;
}
