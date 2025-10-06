// NAME: Copy Text
// AUTHOR: pnthach95, Tetrax-10
// DESCRIPTION: Adds Copy text to context menu for Spotify v1.1.59 and Spicetify v2.0.0 and above

import {SettingsSection} from 'spcr-settings';
import {json2csv} from 'json-2-csv';

const SETTINGS = {
  ID: 'settings-copy-to-clipboard',
  NAME: 'Copy to clipboard settings',
  SEPARATOR: {
    KEY: 'ctc-separator',
    DESCRIPTION: 'Separator between Song name and Artist names',
    DEFAULT: '; ',
  },
} as const;

const DEFAULT_LOCALE = 'en';

const LOCALIZATIONS: Record<string, Partial<Localization>> & {
  [DEFAULT_LOCALE]: Localization;
} = {
  en: {
    artistAndSong: 'Copy Artist names & Song',
    copied: 'Copied',
    copyImage: 'Copy image link',
    error: 'Error',
    exportList: 'Export song list to csv file',
    settings: {
      name: SETTINGS.NAME,
      separator: SETTINGS.SEPARATOR.DESCRIPTION,
    },
    songAndArtist: 'Copy Song & Artist names',
    text: 'Copy Text',
  },
  ru: {
    artistAndSong: 'Скопировать исполнителя и название трека',
    copied: 'Скопировано',
    copyImage: 'Скопировать ссылку на изображение',
    error: 'Ошибка',
    exportList: 'Экспортировать спискок треков в csv файл',
    songAndArtist: 'Скопировать название трека и исполнителя',
    settings: {
      name: 'Настройки Copy to clipboard',
      separator: 'Разделитель между названием трека и исполнителем',
    },
    text: 'Скопировать текст',
  },
  vi: {
    artistAndSong: 'Sao chép tên nghệ sĩ & bài hát',
    copied: 'Đã sao chép',
    copyImage: 'Sao chép liên kết ảnh',
    error: 'Lỗi',
    exportList: 'Xuất danh sách bài hát ra file csv',
    settings: {
      name: 'Cài đặt Copy to clipboard',
      separator: 'Phân cách giữa tên bài hát và tên nghệ sĩ',
    },
    songAndArtist: 'Sao chép tên bài hát & nghệ sĩ',
    text: 'Sao chép tên',
  },
} as const;

function getLocalization(locale: string) {
  if (locale === DEFAULT_LOCALE || !(locale in LOCALIZATIONS)) {
    return LOCALIZATIONS[DEFAULT_LOCALE];
  }

  function deepMerge<T extends Record<string, unknown>>(
    target: T,
    source: Partial<T>,
  ) {
    const result = {...target};

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = target[key];
        if (
          sourceValue &&
          typeof sourceValue === 'object' &&
          targetValue &&
          typeof targetValue === 'object'
        ) {
          result[key] = deepMerge(
            targetValue as Record<string, unknown>,
            sourceValue,
          ) as T[Extract<keyof T, string>];
        } else if (sourceValue !== undefined) {
          result[key] = sourceValue as T[Extract<keyof T, string>];
        }
      }
    }

    return result;
  }

  return deepMerge(LOCALIZATIONS[DEFAULT_LOCALE], LOCALIZATIONS[locale]);
}

async function fetchAlbum(dataType: DataType, id?: string) {
  try {
    const albumInfo: AlbumInfo = await Spicetify.CosmosAsync.get(
      `https://api.spotify.com/v1/albums/${id}`,
    );
    if (dataType === 'image') {
      return albumInfo.images[0].url;
    }
    return albumInfo.name;
  } catch (e) {
    console.log(e);
    throw new Error((e as Error).message);
  }
}

async function fetchArtist(dataType: DataType, uri: string) {
  const {queryArtistOverview} = Spicetify.GraphQL.Definitions;
  try {
    const locale = Spicetify.Locale ? Spicetify.Locale.getLocale() : 'en';
    const {data} = await Spicetify.GraphQL.Request(queryArtistOverview, {
      uri,
      includePrerelease: false,
      locale,
      offset: 0,
      limit: 10,
    });
    if (dataType === 'image') {
      const img = data.artistUnion.headerImage?.data?.sources?.[0]
        ?.url as string;
      if (img) {
        return img;
      }
      throw new Error('No images');
    }
    return data.artistUnion.profile.name as string;
  } catch (e) {
    console.log(e);
    throw new Error((e as Error).message);
  }
}

async function fetchArtists(uri: string) {
  const {queryTrackArtists} = Spicetify.GraphQL.Definitions;
  try {
    const {data} = (await Spicetify.GraphQL.Request(queryTrackArtists, {
      uri,
      offset: 0,
      limit: 10,
    })) as {data: QueryTrackArtistsData};
    return data.trackUnion.artists.items.map(i => i.profile.name).join(', ');
  } catch (e) {
    console.log(e);
    throw new Error((e as Error).message);
  }
}

async function fetchTrackName(uri: string) {
  const {getTrackName} = Spicetify.GraphQL.Definitions;
  try {
    const {data} = (await Spicetify.GraphQL.Request(getTrackName, {
      uri,
      offset: 0,
      limit: 10,
    })) as {data: GetTrackNameData};
    return data.trackUnion.name;
  } catch (e) {
    console.log(e);
    throw new Error((e as Error).message);
  }
}

function getLinkFromUri(uri: string) {
  if (uri.includes('mosaic:')) {
    throw new Error('Cannot copy mosaic image');
  }
  if (uri.startsWith('spotify')) {
    const pictureUri = uri.split(':').pop();
    if (pictureUri) {
      return 'https://i.scdn.co/image/' + pictureUri;
    } else {
      throw new Error('Not found');
    }
  } else {
    return uri;
  }
}

async function fetchPlaylist(dataType: DataType, id: string) {
  try {
    const res = await Spicetify.CosmosAsync.get(
      `sp://core-playlist/v1/playlist/spotify:playlist:${id}`,
    );
    if (dataType === 'name') {
      return res.playlist.name;
    }
    return getLinkFromUri(res.playlist.picture);
  } catch (e) {
    console.log(e);
    throw new Error((e as Error).message);
  }
}

async function fetchShow(dataType: DataType, id: string) {
  try {
    const data = await Spicetify.CosmosAsync.get(
      `sp://core-show/v1/shows/${id}?responseFormat=protobufJson`,
    );
    if (dataType === 'name') {
      return data.header.showMetadata.name;
    }
    return getLinkFromUri(data.header.showMetadata.covers.xlargeLink);
  } catch (e) {
    console.log(e);
    throw new Error((e as Error).message);
  }
}

async function fetchEpisode(dataType: DataType, id: string) {
  try {
    const data = await Spicetify.Platform.ShowAPI.getEpisodeOrChapter(
      `spotify:episode:${id}`,
    );
    if (dataType === 'name') {
      return data.name;
    }
    return getLinkFromUri(
      data.coverArt.reduce(
        (res: Image, curr: Image) => (res.width > curr.width ? res : curr),
        {width: 0, height: 0, url: ''},
      ).url,
    );
  } catch (e) {
    console.log(e);
    throw new Error((e as Error).message);
  }
}

async function fetchProfile(dataType: DataType, username?: string) {
  try {
    const res = await Spicetify.CosmosAsync.get(
      'sp://core-profile/v1/profiles',
      {usernames: username},
    );
    if (dataType === 'name') {
      return res.profiles[0].name;
    }
    return res.profiles[0].images.reduce(
      (res: SpotifyImageMax, curr: SpotifyImageMax) =>
        res.maxWidth > curr.maxWidth ? res : curr,
      {maxWidth: 0, maxHeight: 0, url: ''},
    ).url;
  } catch (e) {
    console.log(e);
    throw new Error((e as Error).message);
  }
}

async function fetchSongArtistText(
  uri: string,
): Promise<{texts: string[]; separator: string}> {
  const [name, artists] = await Promise.allSettled([
    fetchTrackName(uri),
    fetchArtists(uri),
  ]);
  const settings = new SettingsSection(SETTINGS.NAME, SETTINGS.ID);
  const separator = settings.getFieldValue<string>(SETTINGS.SEPARATOR.KEY);
  if (name.status === 'fulfilled' && artists.status === 'fulfilled') {
    return {texts: [name.value, artists.value], separator};
  }
  return {texts: [], separator};
}

function excludeSpecialChar(s: string) {
  return s.replace(/[/\\?%*:|"<>]/g, '-').trim();
}

// https://web.dev/patterns/files/save-a-file
async function exportCSV({data, suggestedName}: ExportCSV) {
  // Create a Blob from the CSV string
  const blob = new Blob([data], {type: 'text/csv'});
  // If the File System Access API is supported…
  try {
    // Show the file save dialog.
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [{accept: {'text/csv': ['.csv']}}],
    });
    // Write the blob to the file.
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  } catch (err) {
    // Fail silently if the user has simply canceled the dialog.
    if (err instanceof Error && err.name !== 'AbortError') {
      console.error(err.name, err.message);
      throw err;
    }
  }
}

async function fetchAlbumSongList(uri: string) {
  try {
    const {getAlbum} = Spicetify.GraphQL.Definitions;
    const {
      data: {albumUnion},
    } = (await Spicetify.GraphQL.Request(getAlbum, {
      uri,
      includePrerelease: false,
      locale: '',
      offset: 0,
      limit: 50,
    })) as {data: {albumUnion: AlbumUnion}};
    const {
      tracksV2: {items: trackItems},
      name: albumName,
      artists: {items: albumArtists},
    } = albumUnion;
    const data: {
      discNumber: number;
      trackNumber: number;
      name: string;
      artists: string;
    }[] = [];
    trackItems.forEach(item => {
      const {
        track: {discNumber, artists, name, trackNumber},
      } = item;
      data.push({
        discNumber,
        trackNumber,
        name,
        artists: artists.items.map(i => i.profile.name).join('; '),
      });
    });
    return {
      data,
      filename: `${albumName} by ${albumArtists.map(a => a.profile.name).join(', ')}`,
    };
  } catch (e) {
    console.log(e);
    throw new Error((e as Error).message);
  }
}

async function fetchAlbumSongListAndExport(uri: string) {
  const result = await fetchAlbumSongList(uri);
  const suggestedName = excludeSpecialChar(result.filename) + '.csv';
  await exportCSV({
    data: json2csv(result.data, {excelBOM: true}),
    suggestedName,
  });
}

async function fetchArtistSongList(uri: string) {
  const artistName = await fetchArtist('name', uri);
  const {queryArtistDiscographyAll} = Spicetify.GraphQL.Definitions;
  const albumUris: {
    name: string;
    releaseDate: string;
    type: string;
    uri: string;
  }[] = [];
  const limit = 50;
  let offset = 0;
  do {
    const {
      data: {
        artistUnion: {
          discography: {
            all: {items: discographies},
          },
        },
      },
    } = (await Spicetify.GraphQL.Request(queryArtistDiscographyAll, {
      uri,
      order: 'DATE_DESC',
      offset,
      limit,
    })) as {
      data: {
        artistUnion: {discography: {all: ItemsWithCount<ArtistDiscography>}};
      };
    };
    discographies.forEach(d => {
      d.releases.items.forEach(i => {
        albumUris.push({
          name: i.name,
          releaseDate: i.date.isoString,
          type: i.type,
          uri: i.uri,
        });
      });
    });
    if (discographies.length < limit) {
      break;
    }
    offset = albumUris.length;
  } while (true);
  const albumPromises = albumUris.map(async u => {
    const result = await fetchAlbumSongList(u.uri);
    return result.data.map<ArtistSongListItemResult>(d => ({
      albumName: u.name,
      discNumber: d.discNumber,
      trackNumber: d.trackNumber,
      name: d.name,
      artists: d.artists,
      type: u.type,
      releaseDate: u.releaseDate,
    }));
  });
  const albumSongListResult = await Promise.allSettled(albumPromises);
  const data: ArtistSongListItemResult[] = [];
  albumSongListResult.forEach(a => {
    if (a.status === 'fulfilled') {
      a.value.forEach(v => {
        data.push(v);
      });
    }
  });
  await exportCSV({
    data: json2csv(data, {excelBOM: true}),
    suggestedName: excludeSpecialChar(artistName) + '.csv',
  });
}

async function fetchPlaylistSongList(id: string) {
  try {
    const {
      items,
      playlist: {name, owner},
    } = (await Spicetify.CosmosAsync.get(
      `sp://core-playlist/v1/playlist/spotify:playlist:${id}`,
    )) as PlaylistData;
    const data: {name: string; artists: string; albumName: string}[] =
      items.map(i => ({
        name: i.name,
        artists: i.artists.map(a => a.name).join('; '),
        albumName: i.album.name,
      }));
    await exportCSV({
      data: json2csv(data, {excelBOM: true}),
      suggestedName: excludeSpecialChar(`${name}, ${owner.name}`) + '.csv',
    });
  } catch (e) {
    console.log(e);
    throw new Error((e as Error).message);
  }
}

function initCopyText(localization: Localization) {
  const getText: Spicetify.ContextMenu.OnClickCallback = async uris => {
    const {Type} = Spicetify.URI;
    const uri = Spicetify.URI.fromString(uris[0]);
    // @ts-ignore _base62Id may be existed on old versions
    const id: string = uri._base62Id || uri.id;

    try {
      switch (uri.type) {
        case Type.TRACK:
          sendToClipboard(await fetchTrackName(uri.toURI()));
          break;
        case Type.LOCAL:
          const tmp: string[] = [];
          if (uri.track) {
            tmp.push(uri.track);
          }
          if (uri.artist) {
            tmp.push(uri.artist);
          }
          if (uri.album) {
            tmp.push(uri.album);
          }
          sendToClipboard(tmp.join('; '));
          break;
        case Type.LOCAL_ARTIST:
          sendToClipboard(`${uri.artist ? uri.artist : ''}`);
          break;
        case Type.LOCAL_ALBUM:
          sendToClipboard(`${uri.album ? uri.album : ''}`);
          break;
        case Type.ALBUM:
          sendToClipboard(await fetchAlbum('name', uri.id));
          break;
        case Type.ARTIST:
          sendToClipboard(await fetchArtist('name', uri.toURI()));
          break;
        case Type.PLAYLIST:
        case Type.PLAYLIST_V2:
          sendToClipboard(await fetchPlaylist('name', id));
          break;
        case Type.SHOW:
          sendToClipboard(await fetchShow('name', id));
          break;
        case Type.EPISODE:
          sendToClipboard(await fetchEpisode('name', id));
          break;
        case Type.PROFILE:
          sendToClipboard(await fetchProfile('name', uri.username));
          break;
        case Type.FOLDER:
          let rootlist: RootlistContent =
            await Spicetify.Platform.RootlistAPI.getContents();
          let folder = rootlist.items.filter(
            item => item.type === 'folder' && item.uri.includes(id),
          );
          sendToClipboard(folder[0].name);
          break;
        default:
          break;
      }
    } catch (error) {
      Spicetify.showNotification(
        `${localization.error}: ${(error as Error).message}`,
      );
    }
  };

  const getImage: Spicetify.ContextMenu.OnClickCallback = async uris => {
    const {Type} = Spicetify.URI;
    const uri = Spicetify.URI.fromString(uris[0]);
    // @ts-ignore _base62Id may be existed on old versions
    const id: string = uri._base62Id ? uri._base62Id : uri.id;

    try {
      switch (uri.type) {
        case Type.TRACK:
          sendToClipboard(await fetchTrackName(uri.toURI()));
          break;
        case Type.ALBUM:
          sendToClipboard(await fetchAlbum('image', uri.id));
          break;
        case Type.ARTIST:
          sendToClipboard(await fetchArtist('image', uri.toURI()));
          break;
        case Type.PLAYLIST:
        case Type.PLAYLIST_V2:
          sendToClipboard(await fetchPlaylist('image', id));
          break;
        case Type.SHOW:
          sendToClipboard(await fetchShow('image', id));
          break;
        case Type.EPISODE:
          sendToClipboard(await fetchEpisode('image', id));
          break;
        case Type.PROFILE:
          sendToClipboard(await fetchProfile('image', uri.username));
          break;
        default:
          break;
      }
    } catch (error) {
      Spicetify.showNotification(
        `${localization.error}: ${(error as Error).message}`,
      );
    }
  };

  const getSongArtistText: Spicetify.ContextMenu.OnClickCallback =
    async uris => {
      const {Type} = Spicetify.URI;
      const uri = Spicetify.URI.fromString(uris[0]);

      try {
        switch (uri.type) {
          case Type.TRACK:
            const {separator, texts} = await fetchSongArtistText(uri.toURI());
            if (texts.length > 0) {
              sendToClipboard(texts[0] + separator + texts[1]);
            }
            break;
          default:
            break;
        }
      } catch (error) {
        Spicetify.showNotification(
          `${localization.error}: ${(error as Error).message}`,
        );
      }
    };

  const getArtistSongText: Spicetify.ContextMenu.OnClickCallback =
    async uris => {
      const {Type} = Spicetify.URI;
      const uri = Spicetify.URI.fromString(uris[0]);

      try {
        switch (uri.type) {
          case Type.TRACK:
            const {separator, texts} = await fetchSongArtistText(uri.toURI());
            if (texts.length > 0) {
              sendToClipboard(texts[1] + separator + texts[0]);
            }
            break;
          default:
            break;
        }
      } catch (error) {
        Spicetify.showNotification(
          `${localization.error}: ${(error as Error).message}`,
        );
      }
    };

  const getExportList: Spicetify.ContextMenu.OnClickCallback = async uris => {
    const {Type} = Spicetify.URI;
    const uri = Spicetify.URI.fromString(uris[0]);

    try {
      switch (uri.type) {
        case Type.ALBUM:
          await fetchAlbumSongListAndExport(uri.toURI());
          break;
        case Type.ARTIST:
          await fetchArtistSongList(uri.toURI());
          break;
        case Type.PLAYLIST:
          Spicetify.showNotification(
            `${localization.error}: Unsupported right now. Please file a issue with this playlist`,
          );
          break;
        case Type.PLAYLIST_V2:
          // @ts-ignore _base62Id may be existed on old versions
          await fetchPlaylistSongList(uri._base62Id || uri.id);
          break;
        default:
          break;
      }
    } catch (error) {
      Spicetify.showNotification(
        `${localization.error}: ${(error as Error).message}`,
      );
    }
  };

  async function sendToClipboard(text: string | null) {
    if (text) {
      if (Spicetify.Platform.ClipboardAPI) {
        Spicetify.Platform.ClipboardAPI.copy(text);
      } else if (navigator?.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Cannot copy text on this Spotify version');
      }
      Spicetify.showNotification(`${localization.copied}: ${text}`);
    }
  }

  const shouldAddContextMenu: Spicetify.ContextMenu.ShouldAddCallback =
    uris => {
      if (uris.length === 1) {
        const {Type} = Spicetify.URI;
        const uri = Spicetify.URI.fromString(uris[0]);
        switch (uri.type) {
          case Type.TRACK:
          case Type.LOCAL:
          case Type.LOCAL_ARTIST:
          case Type.LOCAL_ALBUM:
          case Type.ALBUM:
          case Type.ARTIST:
          case Type.PLAYLIST:
          case Type.PLAYLIST_V2:
          case Type.SHOW:
          case Type.EPISODE:
          case Type.PROFILE:
          case Type.FOLDER:
            return true;
          default:
            return false;
        }
      } else {
        return false;
      }
    };

  const shouldAddCSAContextMenu: Spicetify.ContextMenu.ShouldAddCallback =
    uris => {
      if (uris.length === 1) {
        const {Type} = Spicetify.URI;
        const uri = Spicetify.URI.fromString(uris[0]);
        switch (uri.type) {
          case Type.TRACK:
            return true;
          default:
            return false;
        }
      } else {
        return false;
      }
    };

  const shouldAddExportListContextMenu: Spicetify.ContextMenu.ShouldAddCallback =
    uris => {
      if (uris.length === 1) {
        const {Type} = Spicetify.URI;
        const uri = Spicetify.URI.fromString(uris[0]);
        switch (uri.type) {
          case Type.ALBUM:
          case Type.ARTIST:
          case Type.PLAYLIST:
          case Type.PLAYLIST_V2:
            return true;
          default:
            return false;
        }
      }
      return false;
    };

  const shouldAddCopyImageContextMenu: Spicetify.ContextMenu.ShouldAddCallback =
    uris => {
      if (uris.length === 1) {
        const {Type} = Spicetify.URI;
        const uri = Spicetify.URI.fromString(uris[0]);
        switch (uri.type) {
          case Type.ALBUM:
          case Type.ARTIST:
          case Type.PLAYLIST:
          case Type.PLAYLIST_V2:
          case Type.SHOW:
          case Type.EPISODE:
          case Type.PROFILE:
            return true;
          default:
            return false;
        }
      }
      return false;
    };

  new Spicetify.ContextMenu.Item(
    localization.text,
    getText,
    shouldAddContextMenu,
    'copy',
  ).register();
  new Spicetify.ContextMenu.Item(
    localization.songAndArtist,
    getSongArtistText,
    shouldAddCSAContextMenu,
    'artist',
  ).register();
  new Spicetify.ContextMenu.Item(
    localization.artistAndSong,
    getArtistSongText,
    shouldAddCSAContextMenu,
    'artist',
  ).register();
  new Spicetify.ContextMenu.Item(
    localization.exportList,
    getExportList,
    shouldAddExportListContextMenu,
    'list-view',
  ).register();
  new Spicetify.ContextMenu.Item(
    localization.copyImage,
    getImage,
    shouldAddCopyImageContextMenu,
    'copy',
  ).register();
}

function main() {
  const localization = getLocalization(new Intl.Locale(navigator.language).language);

  const settings = new SettingsSection(localization.settings.name, SETTINGS.ID);
  settings.addInput(
    SETTINGS.SEPARATOR.KEY,
    localization.settings.separator,
    SETTINGS.SEPARATOR.DEFAULT,
  );
  settings.pushSettings();

  initCopyText(localization);
}

export default main;
