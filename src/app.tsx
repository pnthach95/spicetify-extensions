// NAME: Copy Text
// AUTHOR: pnthach95, Tetrax-10
// DESCRIPTION: Adds Copy text to context menu for Spotify v1.1.59 and Spicetify v2.0.0 and above

import {SettingsSection} from 'spcr-settings';

const SETTINGS = {
  ID: 'settings-copy-to-clipboard',
  NAME: 'Copy to clipboard settings',
  SEPARATOR: {
    KEY: 'ctc-separator',
    DESCRIPTION: 'Separator between Song name and Artist names',
    DEFAULT: '; ',
  },
};

const localizations: Record<string, Localization> = {
  ru: {
    error: 'Ошибка',
    text: 'Скопировать текст',
    songAndArtist: 'Cкопировать трек и артиста',
    copied: 'Скопировано',
    settings: {
      name: 'Copy to clipboard settings',
      separator: 'Separator between Song name and Artist names',
    },
  },
  en: {
    error: 'Error',
    text: 'Copy Text',
    songAndArtist: 'Copy Song & Artist names',
    copied: 'Copied',
    settings: {
      name: SETTINGS.NAME,
      separator: SETTINGS.SEPARATOR.DESCRIPTION,
    },
  },
  vi: {
    copied: 'Đã sao chép',
    error: 'Lỗi',
    settings: {
      name: 'Cài đặt Copy to clipboard',
      separator: 'Phân cách giữa tên bài hát và tên nghệ sĩ',
    },
    songAndArtist: 'Sao chép tên bài hát & nghệ sĩ',
    text: 'Sao chép tên',
  },
};

async function getLocalization() {
  await new Promise(resolve => setTimeout(resolve, 1000));
  const locale = Spicetify.Locale ? Spicetify.Locale.getLocale() : 'en';
  // console.log('Spicetify.Locale._locale', Spicetify.Locale._locale);
  // console.log('Spicetify.Locale.getLocale', Spicetify.Locale.getLocale());

  return Object.keys(localizations).includes(locale)
    ? localizations[locale as keyof typeof localizations]
    : localizations['en'];
}

async function fetchAlbum(id?: string) {
  try {
    const albumInfo: AlbumInfo = await Spicetify.CosmosAsync.get(
      `https://api.spotify.com/v1/albums/${id}`,
    );
    return albumInfo.name;
  } catch (e) {
    console.log(e);
    throw new Error((e as Error).message);
  }
}

async function fetchArtist(uri: string) {
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

function initCopyText(localization: Localization) {
  const getText: Spicetify.ContextMenu.OnClickCallback = async uris => {
    const {Type} = Spicetify.URI;
    const uri = Spicetify.URI.fromString(uris[0]);
    // @ts-ignore _base62Id may be existed on old versions
    const id: string = uri._base62Id ? uri._base62Id : uri.id;

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
          sendToClipboard(await fetchAlbum(uri.id));
          break;
        case Type.ARTIST:
          sendToClipboard(await fetchArtist(uri.toURI()));
          break;
        case Type.PLAYLIST:
        case Type.PLAYLIST_V2:
          sendToClipboard(
            (
              await Spicetify.CosmosAsync.get(
                `sp://core-playlist/v1/playlist/spotify:playlist:${id}`,
              )
            ).playlist.name,
          );
          break;
        case Type.SHOW:
          sendToClipboard(
            (
              await Spicetify.CosmosAsync.get(
                `sp://core-show/v1/shows/${id}?responseFormat=protobufJson`,
              )
            ).header.showMetadata.name,
          );
          break;
        case Type.EPISODE:
          sendToClipboard(
            (
              await Spicetify.Platform.ShowAPI.getEpisodeOrChapter(
                `spotify:episode:${id}`,
              )
            ).name,
          );
          break;
        case Type.PROFILE:
          sendToClipboard(
            (
              await Spicetify.CosmosAsync.get('sp://core-profile/v1/profiles', {
                usernames: uri.username,
              })
            ).profiles[0].name,
          );
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

  const getSongArtistText: Spicetify.ContextMenu.OnClickCallback =
    async uris => {
      const {Type} = Spicetify.URI;
      const uri = Spicetify.URI.fromString(uris[0]);

      try {
        switch (uri.type) {
          case Type.TRACK:
            const [name, artists] = await Promise.allSettled([
              fetchTrackName(uri.toURI()),
              fetchArtists(uri.toURI()),
            ]);
            if (name.status === 'fulfilled' && artists.status === 'fulfilled') {
              const settings = new SettingsSection(SETTINGS.NAME, SETTINGS.ID);
              sendToClipboard(
                name.value +
                  settings.getFieldValue(SETTINGS.SEPARATOR.KEY) +
                  artists.value,
              );
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

  function sendToClipboard(text: string | null) {
    if (text) {
      Spicetify.showNotification(`${localization.copied}: ${text}`);
      Spicetify.Platform.ClipboardAPI.copy(text);
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
}

async function main() {
  while (!Spicetify || document.readyState !== 'complete') {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const localization = await getLocalization();
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
