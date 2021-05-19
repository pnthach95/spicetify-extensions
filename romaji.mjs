/// <reference path="global.d.ts" />

import "./node_modules/kuroshiro/dist/kuroshiro.min.js";
import "./node_modules/kuroshiro-analyzer-kuromoji/dist/kuroshiro-analyzer-kuromoji.min.js";

const { Type } = Spicetify.URI;
const kuroshiro = new Kuroshiro();
kuroshiro.init(new KuromojiAnalyzer());

function converter(input) {
  return kuroshiro.convert(input, {
    to: "romaji",
    mode: "spaced",
    romajiSystem: "passport"
  });
}

async function showRomaji(uris) {
  const uri = Spicetify.URI.fromString(uris[0]);
  let data = null;
  try {
    switch (uri.type) {
      case Type.ALBUM:
        data = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/albums/${uri.getBase62Id()}`);
        break;
      case Type.TRACK:
        data = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/tracks/${uri.getBase62Id()}`);
        break;
      case Type.ARTIST:
        data = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/artists/${uri.getBase62Id()}`);
        break;
      case Type.PLAYLIST:
      case Type.PLAYLIST_V2:
        data = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/playlists/${uri.getBase62Id()}`);
        break;
      default:
        break;
    }
  } catch (error) {
    console.log(uri, error);
  }

  let { name } = data;
  if (Kuroshiro.Util.hasJapanese(name)) {
    name = await converter(name);
    name = name.replace(/(^|\s)\S/g, t => t.toUpperCase());
  }
  Spicetify.showNotification(name);
}

function shouldAdd(uris) {
  if (uris.length === 1) {
    const uri = Spicetify.URI.fromString(uris[0]);
    switch (uri.type) {
      case Type.ALBUM:
      case Type.TRACK:
      case Type.ARTIST:
      case Type.PLAYLIST:
      case Type.PLAYLIST_V2:
        return true;
      default:
        return false;
    }
  } else {
    return false;
  }
}

new Spicetify.ContextMenu.Item(`Show Romaji`, showRomaji, shouldAdd).register();
