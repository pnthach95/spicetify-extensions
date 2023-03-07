// NAME: Copy Text
// AUTHOR: pnthach95, Tetrax-10
// DESCRIPTION: Adds Copy text to context menu for Spotify v1.1.59 and Spicetify v2.0.0 and above

/// <reference path="globals.d.ts" />

let copyTextCount = 0;
(async function copyText() {
  if (!Spicetify && copyTextCount < 1000) {
    setTimeout(copyText, 10);
    copyTextCount++;
    return;
  }
  initCopyText();
})();

function initCopyText() {
  const {Type} = Spicetify.URI;

  async function getText(uris) {
    const uri = Spicetify.URI.fromString(uris[0]);
    const id = uri._base62Id ? uri._base62Id : uri.id;

    switch (uri.type) {
      case Type.TRACK:
        sendToClipboard(
          (
            await Spicetify.CosmosAsync.get(
              `https://api.spotify.com/v1/tracks/${id}`,
            )
          ).name,
        );
        break;
      case Type.LOCAL:
        sendToClipboard(
          `${uri.track ? uri.track : ""}${uri.artist ? " by " + uri.artist : ""}${uri.album ? " from " + uri.album : ""}`
        );
        break;
      case Type.LOCAL_ARTIST:
        sendToClipboard(
          `${uri.artist ? uri.artist : ""}`
        );
        break;
      case Type.LOCAL_ALBUM:
        sendToClipboard(
          `${uri.album ? uri.album : ""}`
        );
        break;
      case Type.ALBUM:
        sendToClipboard(
          (
            await Spicetify.CosmosAsync.get(
              `wg://album/v1/album-app/album/${id}/desktop`,
            )
          ).name,
        );
        break;
      case Type.ARTIST:
        sendToClipboard(
          (
            await Spicetify.CosmosAsync.get(
              `wg://artist/v1/${id}/desktop?format=json`,
            )
          ).info.name,
        );
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
              `spotify:episode:${id}`
            )
          ).name,
        );
        break;
      case Type.PROFILE:
        sendToClipboard(
          (await Spicetify.CosmosAsync.get("sp://core-profile/v1/profiles", { usernames: uri.username })).profiles[0].name
        );
        break;
      case Type.FOLDER:
        let rootlist = await Spicetify.Platform.RootlistAPI.getContents();
        let folder = rootlist.items.filter((item) => item.type == "folder" && item.uri.includes(id));
        sendToClipboard(folder[0].name);
        break;
      default:
        break;
    }
  }

  async function getSongArtistText(uris) {
    const uri = Spicetify.URI.fromString(uris[0]);
    const id = uri._base62Id ? uri._base62Id : uri.id;

    switch (uri.type) {
      case Type.TRACK:
        const res = await Spicetify.CosmosAsync.get(
          `https://api.spotify.com/v1/tracks/${id}`,
        );
        sendToClipboard(
          res.name + ' by ' + res.artists.map(a => a.name).join(', '),
        );
        break;
      default:
        break;
    }
  }

  function sendToClipboard(text) {
    if (text) {
      Spicetify.showNotification(`copied : ${text}`);
      Spicetify.Platform.ClipboardAPI.copy(text);
    }
  }

  function shouldAddContextMenu(uris) {
    if (uris.length === 1) {
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
  }

  function shouldAddCSAContextMenu(uris) {
    if (uris.length === 1) {
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
  }

  new Spicetify.ContextMenu.Item(
    'Copy Text',
    getText,
    shouldAddContextMenu,
    'copy',
  ).register();
  new Spicetify.ContextMenu.Item(
    'Copy Song & Artist names',
    getSongArtistText,
    shouldAddCSAContextMenu,
    'artist',
  ).register();
}
