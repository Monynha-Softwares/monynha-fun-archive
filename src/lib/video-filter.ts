export interface FilterableVideo {
  video_categories?: Array<{
    category?: {
      slug: string;
    };
  }>;
  tags?: Array<{
    name: string;
    is_special: boolean;
  }>;
}

export const filterVideos = <T extends FilterableVideo>(
  videos: T[],
  selectedCategory?: string,
  selectedTags: string[] = []
): T[] => {
  return videos.filter(video => {
    if (selectedCategory && !video.video_categories?.some(vc => vc.category?.slug === selectedCategory)) {
      return false;
    }

    if (
      selectedTags.length > 0 &&
      !selectedTags.some(tag => video.tags?.some(videoTag => videoTag.name === tag))
    ) {
      return false;
    }

    return true;
  });
};
