// Récupère une photo réelle (licence libre) pour chaque produit de démo via l'API de Wikimedia Commons.
// Aucune clé ni compte nécessaire. Usage : « node src/fetch-photos.js », puis « node src/seed.js ».
// Résultat mémorisé dans src/photos.json (relançable : les produits déjà traités ne sont pas redemandés).
// Tu peux corriger une photo à la main : remplace l'« url » du produit dans photos.json, puis relance seed.js.
// Les paniers surprise gardent leur illustration (leur contenu n'est pas connu à l'avance).
import fs from "fs";
import { offers } from "./catalog.js";

const API = process.env.WIKI_API || "https://commons.wikimedia.org/w/api.php";
const UA = `CampusSave/1.0 (projet pédagogique ESSECT; ${process.env.WIKI_CONTACT || "contact non renseigné"})`; // Wikimedia demande un User-Agent identifiable
const FILE = new URL("./photos.json", import.meta.url), DELAY = +(process.env.WIKI_DELAY_MS ?? 700), sleep = (ms) => new Promise(r => setTimeout(r, ms));
let cache = {}; try { cache = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { /* premier lancement */ }

const text = (html = "") => html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, " ").trim().slice(0, 120);

// Meilleure photo : JPEG, assez grande, format paysage, dans l'ordre de pertinence de la recherche.
function pick(pages) {
  const list = Object.values(pages || {}).filter(p => p.imageinfo?.[0]?.thumburl).sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  const ok = (ii, strict) => { const r = ii.width / ii.height; return ii.mime === "image/jpeg" && ii.width >= 960 && ii.height >= 500 && r >= (strict ? 1.2 : 1) && r <= (strict ? 1.9 : 2.2); };
  for (const strict of [true, false]) { const p = list.find(p => ok(p.imageinfo[0], strict)); if (p) return p; }
  return null;
}

let ok = 0, ko = 0, skipped = 0;
for (const row of offers) {
  const title = row[1], category = row[2], query = row[7];
  if (category === "Panier surprise") { skipped++; continue; }
  if (cache[title]) { ok++; continue; }
  try {
    const qs = new URLSearchParams({ action: "query", format: "json", generator: "search", gsrsearch: `${query} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "20",
      prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "960", iiextmetadatafilter: "Artist|LicenseShortName" });
    const r = await fetch(`${API}?${qs}`, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (r.status === 429) { console.log("Wikimedia demande de ralentir (429) : relance le script dans quelques minutes."); break; }
    if (!r.ok) { console.log(`✗ ${title} : erreur ${r.status}`); ko++; continue; }
    const d = await r.json();
    if (d.error) { console.log(`✗ ${title} : ${d.error.info || d.error.code}`); ko++; continue; }
    const p = pick(d.query?.pages);
    if (!p) { console.log(`✗ ${title} : aucune photo adaptée pour « ${query} »`); ko++; continue; }
    const ii = p.imageinfo[0], m = ii.extmetadata || {};
    cache[title] = { url: ii.thumburl, credit: text(m.Artist?.value) || "Auteur indiqué sur la page source", license: text(m.LicenseShortName?.value), source: ii.descriptionurl, file: p.title }; ok++;
    fs.writeFileSync(FILE, JSON.stringify(cache, null, 2));
    console.log(`✓ ${title}  →  ${p.title}`);
  } catch (e) { console.log(`✗ ${title} : ${e.message}`); ko++; }
  await sleep(DELAY); // pause entre deux requêtes
}
console.log(`\nTerminé : ${ok} photos prêtes, ${ko} échec(s), ${skipped} panier(s) surprise gardent leur illustration.`);
console.log("Vérifie les noms de fichiers ci-dessus, puis lance « node src/seed.js » pour appliquer les photos aux offres.");
