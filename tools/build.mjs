// node tools/build.mjs <slug> [...]: stamp index.html and atoms.json from <slug>/spec.js, check its links and images, mark it live.
import fs from "fs"; import vm from "vm"; import path from "path"; import { createRequire } from "module";
const require = createRequire(import.meta.url);
const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const Motifs = require(ROOT + "/engine/motifs.js");
function rng(seed){ let s = (Math.imul(seed | 0, 2654435761) ^ 0x9E3779B9) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function dpath(polys){
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9; polys.forEach(p=>p.forEach(q=>{x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}));
  const sc=0.96/Math.max(x1-x0,y1-y0),mx=(x0+x1)/2,my=(y0+y1)/2; let d="";
  polys.forEach(p=>{ let a=0; for(let j=0;j<p.length;j++){const u=p[j],v=p[(j+1)%p.length];a+=u[0]*v[1]-v[0]*u[1];} if(a<0)p=p.slice().reverse(); p.forEach((q,j)=>{ d+=(j?"L":"M")+((q[0]-mx)*sc).toFixed(3)+" "+((q[1]-my)*sc).toFixed(3); }); d+="Z"; });
  return d;
}
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const dir = JSON.parse(fs.readFileSync(ROOT + "/directory.json", "utf8"));
let bad = 0;
for (const slug of process.argv.slice(2)) {
  const D = ROOT + "/" + slug; let P = null;
  vm.runInNewContext(fs.readFileSync(D + "/spec.js", "utf8"), { Kit: { build: p => { P = p; } }, window: {}, console, Math });
  const errs = [];
  // images
  const imgs = new Set(); JSON.stringify(P).replace(/"(@[\w-]+|img\/[\w./-]+\.(?:jpg|png))"/g, (_, s) => imgs.add(s));
  JSON.stringify(P).replace(/(?:src|data-swap|data-seen-src)=\\?["']((?:img\/|\.\.\/engine\/img\/)[\w./-]+)/g, (_, s) => imgs.add(s));
  for (const s of imgs) { const f = s[0] === "@" ? ROOT + "/engine/img/" + s.slice(1) + ".jpg" : s.startsWith("../engine") ? ROOT + s.slice(2) : D + "/" + s; if (!fs.existsSync(f)) errs.push("missing image " + s); }
  // links
  const ids = new Set(P.pages.map(p => p.id).concat(["notfound", "network", "legal"]));
  (P.posts || []).forEach(p => ids.add("post-" + p.slug)); Object.keys(P.rooms).forEach(r => ids.add("room-" + r)); Object.keys(P.anchors || {}).forEach(a => ids.add(a));
  const hrefs = new Set(); JSON.stringify(P).replace(/["'(\[]#([\w-]+)["']/g, (_, h) => hrefs.add(h)); JSON.stringify(P).replace(/href=\\?["']#([\w-]+)/g, (_, h) => hrefs.add(h));
  for (const h of hrefs) if (!ids.has(h) && !/^[0-9a-f]{3,8}$/i.test(h)) errs.push("dead link #" + h);
  if (!P.pages.some(p => p.id === "legal")) errs.push("no legal page");
  if (!P.pages.some(p => p.id === (P.dive.view || "dive"))) errs.push("no dive page");
  if (!Motifs.names.includes(P.motif.shape)) errs.push("unknown motif " + P.motif.shape);
  if (errs.length) { console.log(slug, "PROBLEMS:\n  " + errs.join("\n  ")); bad++; continue; }
  const fonts = (P.theme.fonts || "").split("|").filter(Boolean);
  fs.writeFileSync(D + "/index.html", `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(P.name + " · " + P.title)}</title>
<meta name="description" content="${esc(P.description)}">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='-0.5 -0.5 1 1'><path d='${dpath(Motifs.polys(P.motif.shape, 1, rng(14), 0))}' fill='${P.theme.accent}'/></svg>`)}">
${fonts.length ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n` : ""}<link rel="stylesheet" href="../engine/engine.css">
<link rel="stylesheet" href="../engine/kit.css">
</head>
<body data-depth="0">
<main></main>
<script src="../engine/motifs.js"></script>
<script src="../engine/kit.js"></script>
<script src="spec.js"></script>
<script src="../engine/oddities.js"></script>
<script src="../engine/engine.js"></script>
<script src="../engine/invisible-hands.js"></script>
<script src="../engine/bridge.js"></script>
</body>
</html>
`);
  const A = P.atoms;
  const atoms = { slug, name: P.name, word: P.word, icon: dpath(Motifs.polys(P.motif.shape, 1, rng(14), 0)), palette: A.palette, words: A.words, lines: A.lines, captions: A.captions, images: A.images.map(s => s[0] === "@" ? "../engine/img/" + s.slice(1) + ".jpg" : s), who: A.who };
  fs.writeFileSync(D + "/atoms.json", JSON.stringify(atoms, null, 1));
  const e = dir.find(x => x.slug === slug); if (e) e.live = true;
  console.log(slug, "ok:", P.pages.length, "pages,", (P.posts || []).length, "posts,", Object.keys(P.rooms).length, "rooms,", imgs.size, "images");
}
fs.writeFileSync(ROOT + "/directory.json", JSON.stringify(dir, null, 1));
process.exit(bad ? 1 : 0);
