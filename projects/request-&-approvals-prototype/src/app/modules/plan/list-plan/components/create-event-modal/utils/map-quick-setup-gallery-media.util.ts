import { MediaListItem } from '@fz-original/app/shared/models/media/media.model';
import { CreateMainPlanMediaItem } from '@fz-original/app/shared/services/plan/create-main-plan.service';

export function mapQuickSetupGalleryMedia(photos: MediaListItem[]): CreateMainPlanMediaItem[] {
  return photos
    .filter(photo => photo.url)
    .map(photo => {
      const media: CreateMainPlanMediaItem = {
        name: photo.name ?? '',
        url: photo.url,
      };

      if (photo.media_type === 'video') {
        return {
          ...media,
          playback_rate: photo.playback_rate ?? undefined,
          poster: photo.poster,
        };
      }

      return media;
    });
}
