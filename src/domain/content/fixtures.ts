import type { ContentItem, Episode } from "./models";

export const films: ContentItem[] = [
  { id: "friends", title: "Friends", type: "Series", episodes: 24 },
  { id: "office", title: "The Office", type: "Series", episodes: 12 },
];

export const episodes: Record<string, Episode[]> = {
  friends: [
    { id: "friends-ep1", seriesId: "friends", name: "Episode 1", words: 120 },
    { id: "friends-ep2", seriesId: "friends", name: "Episode 2", words: 95 },
  ],
};
