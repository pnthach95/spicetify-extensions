import "./node_modules/kuroshiro/dist/kuroshiro.min.js";
import "./node_modules/kuroshiro-analyzer-kuromoji/dist/kuroshiro-analyzer-kuromoji.min.js";

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
  let name = Spicetify.LiveAPI(uris[0])._data.name;
  if (Kuroshiro.Util.hasJapanese(name)) {
    name = await converter(name);
    name = name.replace(/(^|\s)\S/g, t => t.toUpperCase());
  }
  Spicetify.showNotification(name);
}

new Spicetify.ContextMenu.Item(`Show Romaji`, showRomaji).register();