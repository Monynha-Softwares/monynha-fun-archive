export interface FilterableVideo {
  title?: string;
  description?: string;
  language?: string;
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
  selectedTags: string[] = [],
  searchQuery?: string,
  selectedLanguage?: string
): T[] => {
  const normalizedQuery = searchQuery?.trim().toLowerCase();
  const normalizedLanguage = selectedLanguage?.toLowerCase();

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

    if (normalizedLanguage && video.language?.toLowerCase() !== normalizedLanguage) {
      return false;
    }

    if (normalizedQuery) {
      const titleMatch = video.title?.toLowerCase().includes(normalizedQuery) ?? false;
      const descriptionMatch = video.description?.toLowerCase().includes(normalizedQuery) ?? false;
      const tagMatch = video.tags?.some(tag => tag.name.toLowerCase().includes(normalizedQuery)) ?? false;

      if (!titleMatch && !descriptionMatch && !tagMatch) {
        return false;
      }
    }

    return true;
  });
};
