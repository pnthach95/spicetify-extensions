interface External_url {
  spotify: string;
}

interface Image {
  url: string;
  height: number;
  width: number;
}

interface External_url {
  spotify: string;
}

interface Artist {
  external_urls: External_url;
  href: string;
  id: string;
  name: string;
  type: string;
  uri: string;
}

interface External_url {
  spotify: string;
}

interface Artist {
  external_urls: External_url;
  href: string;
  id: string;
  name: string;
  type: string;
  uri: string;
}

interface External_url {
  spotify: string;
}

interface Item {
  artists: Artist[];
  available_markets: string[];
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  external_urls: External_url;
  href: string;
  id: string;
  name: string;
  preview_url: string;
  track_number: number;
  type: string;
  uri: string;
  is_local: boolean;
}

interface Track {
  href: string;
  limit: number;
  next?: any;
  offset: number;
  previous?: any;
  total: number;
  items: Item[];
}

interface Copyright {
  text: string;
  type: string;
}

interface External_id {
  upc: string;
}

interface AlbumInfo {
  album_type: string;
  total_tracks: number;
  available_markets: string[];
  external_urls: External_url;
  href: string;
  id: string;
  images: Image[];
  name: string;
  release_date: string;
  release_date_precision: string;
  type: string;
  uri: string;
  artists: Artist[];
  tracks: Track;
  copyrights: Copyright[];
  external_ids: External_id;
  genres: any[];
  label: string;
  popularity: number;
}

type RootlistContent = {
  items: {type: string; uri: string[]; name: string}[];
};

type GetTrackNameData = {
  trackUnion: {
    name: string;
  };
};

type QueryTrackArtistsData = {
  trackUnion: {
    artists: {
      items: {
        profile: {
          name: string;
        };
        uri: `spotify:artist:${string}`;
      }[];
    };
    uri: `spotify:track:${string}`;
  };
};

type Localization = {
  error: string;
  text: string;
  artistAndSong: string;
  songAndArtist: string;
  copyMore: string;
  copyImage: string;
  copied: string;
  settings: {
    name: string;
    separator: string;
  };
};

type DataType = 'name' | 'image';

type SpotifyImageMax = {
  maxWidth: number;
  maxHeight: number;
  url: string;
};

type SpotifyImage = {
  width: number;
  height: number;
  url: string;
};
