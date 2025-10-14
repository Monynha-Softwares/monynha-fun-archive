import { describe, it, expect } from "bun:test";
import { filterVideos, FilterableVideo } from "../lib/video-filter";

describe("filterVideos", () => {
  type TestVideo = FilterableVideo & { id: string };

  const makeVideo = (id: string, slug: string, tags: string[] = []): TestVideo => ({
    id,
    tags: tags.map(tag => ({ name: tag, is_special: false })),
    video_categories: [
      {
        category: {
          slug,
        },
      },
    ],
  });

  it("returns videos that match the selected category", () => {
    const videos = [makeVideo("1", "funny"), makeVideo("2", "serious")];

    const result = filterVideos(videos, "funny", []);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("1");
  });

  it("combines category and tag filters", () => {
    const videos = [
      makeVideo("1", "funny", ["cats"]),
      makeVideo("2", "funny", ["dogs"]),
    ];

    const result = filterVideos(videos, "funny", ["cats"]);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("1");
  });
});
