// NAME: Copy Text
// AUTHOR: pnthach95, Tetrax-10
// DESCRIPTION: Adds Copy text to context menu for Spotify v1.1.59 and Spicetify v2.0.0 and above

type RootlistContent = {
  items: {type: string; uri: string[]; name: string}[];
};
type CosmosTrackData = {
  name: string;
  artists: {name: string}[];
};
type Localization = {
  text: string;
  songAndArtist: string;
  copied: string;
};

const localizations: Record<string, Localization> = {
  ru: {
    text: 'Скопировать текст',
    songAndArtist: 'Cкопировать трек и артиста',
    copied: 'Скопировано',
  },
  en: {
    text: 'Copy Text',
    songAndArtist: 'Copy Song & Artist names',
    copied: 'Copied',
  },
};

function getLocalization() {
  const spotifyLocale = Spicetify.Locale ? Spicetify.Locale.getLocale() : 'en';
  return Object.keys(localizations).includes(spotifyLocale)
    ? localizations[spotifyLocale as keyof typeof localizations]
    : localizations['en'];
}

async function fetchAlbum(uri: string) {
  const {getAlbum} = Spicetify.GraphQL.Definitions;
  try {
    const {data} = await Spicetify.GraphQL.Request(getAlbum, {
      uri,
      locale: Spicetify.Locale ? Spicetify.Locale.getLocale() : 'en',
      offset: 0,
      limit: 10,
    });
    return data.albumUnion.name as string;
  } catch {
    return null;
  }
}

async function fetchArtist(uri: string) {
  const {queryArtistMinimal} = Spicetify.GraphQL.Definitions;
  try {
    const {data} = await Spicetify.GraphQL.Request(queryArtistMinimal, {
      uri,
      offset: 0,
      limit: 10,
    });
    return data.artistUnion.profile.name as string;
  } catch {
    return null;
  }
}

function initCopyText() {
  const getText: Spicetify.ContextMenu.OnClickCallback = async uris => {
    const {Type} = Spicetify.URI;
    const uri = Spicetify.URI.fromString(uris[0]);
    // @ts-ignore _base62Id may be existed on old versions
    const id: string = uri._base62Id ? uri._base62Id : uri.id;

    switch (uri.type) {
      case Type.TRACK:
        sendToClipboard(
          (
            await Spicetify.CosmosAsync.get(
              `https://api.spotify.com/v1/tracks/${id}`,
            )
          ).name as string,
        );
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
        sendToClipboard(await fetchAlbum(uri.toURI()));
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
  };

  const getSongArtistText: Spicetify.ContextMenu.OnClickCallback =
    async uris => {
      const {Type} = Spicetify.URI;
      const uri = Spicetify.URI.fromString(uris[0]);
      // @ts-ignore _base62Id may be existed on old versions
      const id = uri._base62Id ? uri._base62Id : uri.id;

      switch (uri.type) {
        case Type.TRACK:
          const res: CosmosTrackData = await Spicetify.CosmosAsync.get(
            `https://api.spotify.com/v1/tracks/${id}`,
          );
          sendToClipboard(
            res.name + '; ' + res.artists.map(a => a.name).join(', '),
          );
          break;
        default:
          break;
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

  const localization = getLocalization();

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

  initCopyText();
}

export default main;
