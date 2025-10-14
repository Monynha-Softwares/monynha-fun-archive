import { describe, it, expect } from "bun:test";
import { filterVideos, FilterableVideo } from "../lib/video-filter";

describe("filterVideos", () => {
  type TestVideo = FilterableVideo & { id: string };

  const makeVideo = (
    id: string,
    slug: string,
    tags: string[] = [],
    language: string = "pt",
    title = `Video ${id}`,
    description = `Description for video ${id}`,
  ): TestVideo => ({
    id,
    title,
    description,
    language,
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

  it("filters by language when provided", () => {
    const videos = [
      makeVideo("1", "funny", [], "pt"),
      makeVideo("2", "funny", [], "en"),
    ];

    const result = filterVideos(videos, undefined, [], undefined, "en");

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("2");
  });

  it("matches search query against title, description, and tags", () => {
    const videos = [
      makeVideo("1", "funny", ["cats"], "pt", "Gatos engraçados"),
      makeVideo("2", "funny", ["dogs"], "pt", "Video comum", "Descrição com gatos"),
      makeVideo("3", "funny", ["dogs"], "pt", "Video comum"),
    ];

    const result = filterVideos(videos, undefined, [], "gatos");

    expect(result).toHaveLength(2);
    expect(result.map(video => video.id)).toEqual(["1", "2"]);
  });
});
