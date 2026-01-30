export type ContentType = "Movie" | "Series";

export interface Movie {
  id: string;
  title: string;
  type: "Movie";
  runtimeMinutes?: number;
}

export interface Series {
  id: string;
  title: string;
  type: "Series";
  seasons?: number;
  episodes?: number;
}

export interface Season {
  id: string;
  seriesId: string;
  name: string;
  episodeCount: number;
}

export interface Episode {
  id: string;
  seriesId: string;
  name: string;
  words: number;
}

export type ContentItem = Movie | Series;
