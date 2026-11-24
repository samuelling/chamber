/* Chamber bridge: lets member sites bleed into each other.
   Only numbers from 0 to 1 arrive (from other tabs, the Chamber's patch bay, or an Invisible Hands room);
   the numbers pick which sibling's atoms.json to borrow from and how much of this page to hand over.
   The host page provides window.Engine (or window.ChamberHost) with: site.slug, site.name, depth(),
   forceDepth(v), count(), dive(), setForeignMotif(d), setForeignSpeck(uri), hideSpecks(). */
(function(){
"use strict";
var H = window.Engine || window.ChamberHost; if (!H) return;
var S = H.site, ME = S.slug;
var here = document.currentScript && document.currentScript.src || location.href;
var ROOT = new URL("../", here).href;      /* the Chamber's root, wherever this site lives */
var $ = function(s, r){ return (r || document).querySelector(s); };
var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
function clamp(v){ v = +v; return v < 0 ? 0 : v > 1 ? 1 : v || 0; }
function pick(a, r){ return a[Math.floor((r == null ? Math.random() : r) * a.length) % a.length]; }
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }

/* ---------- switch: remote control can always be stopped ---------- */
var KEY = "chamber:net";
var allow = true; try { allow = localStorage.getItem(KEY) !== "off"; } catch (e) {}

/* ---------- the directory and siblings' atoms ---------- */
var DIR = [], atoms = {}, loading = {};
fetch(ROOT + "directory.json").then(function(r){ return r.json(); }).then(function(d){ DIR = d; refresh(); }).catch(function(){});
function entry(slug){ for (var i = 0; i < DIR.length; i++) if (DIR[i].slug === slug) return DIR[i]; return null; }
function load(slug){
  if (atoms[slug] || loading[slug]) return atoms[slug];
  var e = entry(slug); if (!e) return null;
  var url = new URL(e.path + "atoms.json", ROOT).href; loading[slug] = 1;   /* one try per page view */
  fetch(url).then(function(r){ return r.json(); }).then(function(a){
    a.images = (a.images || []).map(function(p){ return new URL(p, url).href; });
    atoms[slug] = a; refresh();
  }).catch(function(){});
  return null;
}
/* source 0..1 sweeps the directory's slots; an unbuilt slot falls to the nearest live sibling */
function sourceSlug(v){
  if (!DIR.length) return null;
  var n = DIR.length, at = Math.min(n - 1, Math.floor(clamp(v) * n));
  for (var d = 0; d < n; d++) for (var s = -1; s <= 1; s += 2){
    var e = DIR[((at + s * d) % n + n) % n];
    if (e.live && e.slug !== ME) return e.slug;
  }
  return null;
}

/* ---------- the controls ---------- */
var P = { source: 0, bleed: 0, motif: 0, rot: 0, palette: 0, depth: 0, pulse: 0, visitor: 0, weird: 0, glitch: 0 };
var lastRemote = 0;   /* when a person last moved something; the local LFO yields to them */
function setP(id, v, remote){
  if (!(id in P) || !allow) return;
  var old = P[id]; P[id] = clamp(v);
  if (remote) lastRemote = Date.now();
  if (id === "pulse" && P.pulse > 0.5 && old <= 0.5) pulse();
  if (id === "glitch" && P.glitch > 0.5 && old <= 0.5 && window.Oddities) Oddities.glitch();
  refresh();
}

/* ---------- what this site reports ---------- */
var since = Date.now(), flinch = 0, lastY = window.scrollY;
window.addEventListener("hashchange", function(){ since = Date.now(); revertAll(); });
window.addEventListener("scroll", function(){ var y = window.scrollY; if (y < lastY - 30) flinch = Math.min(1, flinch + 0.08); lastY = y; }, { passive: true });
setInterval(function(){ flinch *= 0.96; }, 250);
var OUTS = {
  depth: function(){ return clamp(H.depth() / 4); },
  dwell: function(){ return clamp((Date.now() - since) / 120000); },
  dive: function(){ var d = H.dive && H.dive(); return d && d.speed ? clamp(d.speed() * 3) : 0; },
  flinch: function(){ return clamp(flinch); },
  count: function(){ return clamp((H.count ? H.count() : 0) % 1000 / 1000); }
};
function outs(){ var o = {}; for (var k in OUTS) o[k] = Math.round(OUTS[k]() * 1000) / 1000; return o; }

/* ---------- swaps: every change keeps a way back ---------- */
var undo = [];   /* {el, kind, back} */
function revertAll(){ while (undo.length) undo.pop().back(); }
function revertOne(kind){ for (var i = undo.length - 1; i >= 0; i--) if (undo[i].kind === kind){ undo.splice(i, 1)[0].back(); return true; } return false; }
function countOf(kind){ var n = 0; undo.forEach(function(u){ if (u.kind === kind) n++; }); return n; }
function view(){ return $(".view.active") || $("main") || document.body; }
function taken(el){ return undo.some(function(u){ return u.el === el || (u.el.contains && (u.el.contains(el) || el.contains(u.el))); }); }
function swapText(a){
  var els = $$("h1,h2,h3,.lede,p,figcaption,blockquote", view()).filter(function(e){ return e.offsetParent && !e.closest(".net-panel,.chat,.cookie,nav,form") && e.textContent.trim().length > 3 && !taken(e); });
  if (!els.length) return;
  var el = pick(els), tag = el.tagName, line;
  if (tag === "FIGCAPTION") line = pick(a.captions && a.captions.length ? a.captions : a.lines);
  else if (tag === "P" || tag === "BLOCKQUOTE") line = pick(a.lines) + " " + pick(a.lines);
  else line = pick(a.lines);
  var old = el.innerHTML; el.innerHTML = "<span class='bleed' data-from='" + esc(a.slug) + "'>" + esc(line) + "</span>";
  undo.push({ el: el, kind: "text", back: function(){ el.innerHTML = old; } });
}
function swapImage(a){
  if (!a.images.length) return;
  var ims = $$(".ph img:not(.swap)", view()).filter(function(i){ return i.offsetParent && !taken(i); });
  if (!ims.length) return;
  var im = pick(ims), old = im.getAttribute("src");
  im.setAttribute("src", pick(a.images)); im.classList.add("bled");
  undo.push({ el: im, kind: "img", back: function(){ im.setAttribute("src", old); im.classList.remove("bled"); } });
}
function swapWord(a){
  var words = a.words && a.words.length ? a.words : [a.word];
  var ps = $$("p,li,h2,h3", view()).filter(function(e){ return e.offsetParent && !e.closest(".net-panel,.chat,.cookie,nav,form") && !taken(e); });
  for (var tries = 0; tries < 6 && ps.length; tries++){
    var p = pick(ps), walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT), nodes = [], t;
    while ((t = walker.nextNode())) if (/[A-Za-z]{4,}/.test(t.nodeValue) && !t.parentNode.closest(".bleed")) nodes.push(t);
    if (!nodes.length) continue;
    var node = pick(nodes), m = node.nodeValue.match(/[A-Za-z]{4,}/g), w = pick(m), at = node.nodeValue.indexOf(w);
    var rest = node.splitText(at); rest.nodeValue = rest.nodeValue.slice(w.length);
    var span = document.createElement("span"); span.className = "bleed"; span.textContent = pick(words);
    if (w[0] === w[0].toUpperCase()) span.textContent = span.textContent[0].toUpperCase() + span.textContent.slice(1);
    rest.parentNode.insertBefore(span, rest);
    undo.push({ el: span, kind: "word", back: function(){ if (span.parentNode){ span.parentNode.replaceChild(document.createTextNode(w), span); p.normalize(); } } });
    return;
  }
}
/* bleed: a stray word first, then lines, then photographs, then nearly everything */
function want(kind, b, r){
  if (kind === "word") return Math.round(Math.min(1, b * 4) * 6 + r * r * 40);
  if (kind === "text") return b < 0.2 ? 0 : Math.round(Math.pow((b - 0.2) / 0.8, 1.4) * 40);
  if (kind === "img") return b < 0.35 ? 0 : Math.round(Math.pow((b - 0.35) / 0.65, 1.2) * 10);
  return 0;
}
var current = null;
function busy(){ return P.bleed > 0.005 || P.rot > 0.005 || P.motif > 0.5 || P.palette > 0.005 || P.pulse > 0.5 || P.visitor > 0.5; }
function step(){
  if (!busy()){ if (undo.length) revertAll(); return; }
  var src = sourceSlug(P.source), a = src && load(src);
  if (!a || !allow){ if (undo.length) revertAll(); return; }
  if (current !== src){ revertAll(); current = src; }
  [["word", swapWord], ["text", swapText], ["img", swapImage]].forEach(function(k){
    var n = want(k[0], P.bleed, P.rot), have = countOf(k[0]), moves = 0;
    while (have > n && moves++ < 3){ revertOne(k[0]); have--; }
    while (have < n && moves++ < 3){ k[1](a); have++; }
  });
}

/* ---------- palette, motif, depth, pulse, visitor ---------- */
var tint = document.createElement("div"); tint.className = "net-tint"; document.body.appendChild(tint);
var pulseEl = document.createElement("div"); pulseEl.className = "net-pulse"; document.body.appendChild(pulseEl);
var whisper = document.createElement("div"); whisper.className = "net-whisper"; whisper.setAttribute("aria-live", "polite"); document.body.appendChild(whisper);
var visitorTimer = null, visitorLine = 0;
function iconUri(a){ return "url(\"data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='-0.5 -0.5 1 1'><path d='" + a.icon + "' fill='" + (a.palette && a.palette.ink || "#ddd") + "' stroke='#222' stroke-width='0.05'/></svg>") + "\")"; }
function pulse(){
  var a = atoms[sourceSlug(P.source)]; if (!a || !allow) return;
  pulseEl.innerHTML = (a.images.length ? "<img src='" + pick(a.images) + "' alt=''>" : "") + "<div>" + esc(pick(a.lines)) + "</div>";
  pulseEl.style.background = a.palette && a.palette.bg || "#000"; pulseEl.style.color = a.palette && a.palette.ink || "#fff";
  pulseEl.classList.add("on"); setTimeout(function(){ pulseEl.classList.remove("on"); }, 140);
}
function refresh(){
  var src = sourceSlug(P.source), a = src && (busy() ? load(src) : atoms[src]), on = allow && a;
  tint.style.background = on && a.palette ? a.palette.accent : "transparent";
  tint.style.opacity = on ? (P.palette * 0.55).toFixed(3) : 0;
  if (H.setForeignMotif) H.setForeignMotif(on && P.motif > 0.5 ? a.icon : null);
  if (H.setForeignSpeck) H.setForeignSpeck(on && P.bleed > 0.1 ? iconUri(a) : null);
  if (H.forceDepth) H.forceDepth(allow ? P.depth : 0);
  var who = on && P.visitor > 0.5 ? (a.who || (atoms.mouthbreeder && atoms.mouthbreeder.who)) : null;
  if (!who && allow && P.visitor > 0.5 && !atoms.mouthbreeder) load("mouthbreeder");
  if (who && !visitorTimer){
    var say = function(){ whisper.textContent = who.name + ": " + who.lines[visitorLine++ % who.lines.length]; whisper.classList.add("on"); setTimeout(function(){ whisper.classList.remove("on"); }, 3600); };
    say(); visitorTimer = setInterval(say, 5200);
  } else if (!who && visitorTimer){ clearInterval(visitorTimer); visitorTimer = null; whisper.classList.remove("on"); }
  drawPanel();
}
setInterval(step, 700);

/* ---------- alone: other tabs on this computer, over the same-origin channel ---------- */
var bc = null, tabs = {};   /* slug -> {outs, at} */
try { bc = new BroadcastChannel("chamber"); } catch (e) {}
if (bc){
  bc.onmessage = function(ev){
    var m = ev.data || {};
    if (m.t === "st" && m.slug && m.slug !== ME){ tabs[m.slug] = { outs: m.outs || {}, name: m.name, at: Date.now() }; }
    if (m.t === "set" && (m.to === ME || m.to === "*") && typeof m.v === "number") setP(m.p, m.v, true);
  };
  setInterval(function(){ bc.postMessage({ t: "st", slug: ME, name: S.name, outs: outs(), p: P, allow: allow }); }, 500);
}
/* each site's own slow LFOs: only run while a sibling is open in another tab, and only until someone takes over */
var t0 = Date.now();
setInterval(function(){
  var now = Date.now(), live = Object.keys(tabs).filter(function(s){ return now - tabs[s].at < 3000 && s !== "chamber"; });
  for (var s in tabs) if (now - tabs[s].at > 3000) delete tabs[s];
  if (!allow || now - lastRemote < 20000) return;
  if (!live.length){ if (P.bleed || P.rot || P.motif || P.palette){ P.bleed = P.rot = P.motif = P.palette = 0; refresh(); } return; }
  var other = live[Math.floor(now / 45000) % live.length], o = tabs[other].outs, e = entry(other), t = (now - t0) / 1000;
  if (e) P.source = (DIR.indexOf(e) + 0.5) / DIR.length;
  var lfo = 0.5 - 0.5 * Math.cos(t / 90 * Math.PI * 2);        /* 90 s */
  var lfo2 = 0.5 - 0.5 * Math.cos(t / 37 * Math.PI * 2 + 1.3);  /* 37 s */
  var deep = o.depth || 0;
  P.bleed = clamp(lfo * (0.12 + 0.6 * deep));
  P.rot = clamp(lfo2 * (0.15 + 0.5 * deep));
  P.palette = clamp(lfo * deep * 0.6);
  P.motif = deep >= 0.99 && lfo > 0.7 ? 1 : 0;
  if ((o.flinch || 0) > 0.5 && Math.random() < 0.08) pulse();
  refresh();
}, 1000);

/* ---------- linked: an Invisible Hands room ---------- */
var hands = null;
var tagOf = {}, chipMark = null;
if (window.InvisibleHands){
  var LABEL = { source: "Source site (which member bleeds in)", bleed: "Bleed (how much leaks in)", motif: "Motif swap", rot: "Rot (words turn)", palette: "Palette shift", depth: "Depth (force the dark)", pulse: "Pulse (flash, trigger)", visitor: "Visitor (whispers, toggle)", weird: "Weird (how often it goes wrong)", glitch: "Glitch (one episode, trigger)" };
  var params = Object.keys(P).map(function(k){
    return { id: k, label: LABEL[k] || k, kind: k === "pulse" || k === "glitch" ? "trig" : k === "visitor" ? "toggle" : "cont", get: function(){ return P[k]; }, set: function(v){ setP(k, v, true); } };
  });
  hands = window.InvisibleHands.create({
    app: "chamber-" + ME, name: S.name, params: params,
    outs: Object.keys(OUTS).map(function(k){ return { id: k, label: k, get: OUTS[k] }; }),
    allow: allow
  });
  hands.on("status", drawPanel); hands.on("peers", drawPanel);
  /* the mark: beside every control the room can move, and on the chip (its pointer follows bleed) */
  Object.keys(P).forEach(function(k){ tagOf[k] = hands.tag(k, { title: "Others can move " + (LABEL[k] || k).split(" (")[0].toLowerCase() + ", over Invisible Hands" }); });
  chipMark = hands.tag("bleed", { title: "Others can move this page, over Invisible Hands" });
  /* a room follows you from member to member in this tab, until you leave it */
  hands.on("status", function(st){ try { if (st === "on" && hands.room) sessionStorage.setItem("ih-room", hands.room); if (st === "off" && !hands.room) sessionStorage.removeItem("ih-room"); } catch (e) {} });
  setTimeout(function(){ try { var keep = sessionStorage.getItem("ih-room"); if (keep && !hands.room && hands.status !== "on" && allow) hands.join(keep); } catch (e) {} }, 0);
}

/* ---------- the chip, the panel and the switch ---------- */
var chip = document.createElement("button"); chip.className = "net-chip"; chip.type = "button"; chip.hidden = true;
chip.setAttribute("aria-controls", "net-panel"); chip.setAttribute("aria-expanded", "false");
var panel = document.createElement("div"); panel.className = "net-panel"; panel.id = "net-panel"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Network");
document.body.appendChild(chip); document.body.appendChild(panel);
function open(v){ panel.classList.toggle("on", v); chip.setAttribute("aria-expanded", String(v)); if (v) drawPanel(true); }
chip.addEventListener("click", function(){ open(!panel.classList.contains("on")); });
document.addEventListener("click", function(e){ var a = e.target.closest && e.target.closest("a[href='#network']"); if (a){ e.preventDefault(); open(true); } });
var handsBox = null;
function drawPanel(force){
  var linked = hands && hands.status === "on", local = Object.keys(tabs).length > 0;
  var moving = allow && (P.bleed > 0.01 || P.rot > 0.01 || P.depth > 0.01 || P.visitor > 0.5 || P.motif > 0.5);
  chip.hidden = !(linked || local || moving || !allow || panel.classList.contains("on"));
  chip.setAttribute("data-live", linked || moving ? "1" : "0");
  chip.textContent = "";
  if (chipMark){ chip.classList.add("has-mark"); chip.appendChild(chipMark); }
  chip.appendChild(document.createTextNode(!allow ? "Network off" : linked ? "Linked · " + hands.room : local ? "Network · " + Object.keys(tabs).length + " nearby" : "Network"));
  if (!panel.classList.contains("on") && force !== true) return;
  var src = sourceSlug(P.source), e = src && entry(src);
  var NAME = { source: "Source", bleed: "Bleed", rot: "Rot", motif: "Motif", palette: "Palette", depth: "Depth", pulse: "Pulse", visitor: "Visitor", weird: "Weird", glitch: "Glitch" };
  var bars = ["source", "bleed", "rot", "motif", "palette", "depth", "pulse", "visitor", "weird", "glitch"].map(function(k){
    var val = k === "source" ? "<span class='mono'>" + (e ? esc(e.name) : "—") + "</span>"
      : k === "pulse" || k === "visitor" || k === "glitch" ? "<span class='mono'>" + (P[k] > 0.5 ? "on" : "off") + "</span>"
      : "<span class='bar'><i style='width:" + Math.round(P[k] * 100) + "%'></i></span>";
    return "<div class='row'><span class='ctl' data-k='" + k + "'>" + NAME[k] + "</span>" + val + "</div>"; }).join("");
  panel.innerHTML = "<h4>The Chamber network</h4>" +
    "<p style='margin:0 0 10px'>" + esc(S.name) + " is a member of the <a href='" + ROOT + "'>Chamber</a>. Other members can lean on this page while it is open. Only numbers travel between sites.</p>" +
    "<div class='row'><span>Remote control</span><button class='btn btn-sm " + (allow ? "btn-primary" : "btn-ghost") + "' id='net-allow'>" + (allow ? "On, tap to stop" : "Off, tap to allow") + "</button></div>" +
    "<div class='row'><span>Leaning in</span><span class='mono'>" + (e && allow && (P.bleed > 0.01 || P.rot > 0.01) ? esc(e.name) : "nobody") + "</span></div>" + bars +
    "<div class='row'><span>Open nearby</span><span class='mono'>" + (Object.keys(tabs).map(function(s){ return esc(tabs[s].name || s); }).join(", ") || "none") + "</span></div>" +
    "<h4 style='margin-top:14px'>Rooms</h4><div id='net-hands'></div>";
  $$(".ctl", panel).forEach(function(el){ var t = tagOf[el.getAttribute("data-k")]; if (t) el.appendChild(t); });
  $("#net-allow", panel).addEventListener("click", function(){
    allow = !allow; try { localStorage.setItem(KEY, allow ? "on" : "off"); } catch (er) {}
    if (hands) hands.allow = allow;
    if (!allow){ for (var k in P) P[k] = 0; revertAll(); }
    refresh(); drawPanel(true);
  });
  var box = $("#net-hands", panel);
  if (hands && hands.relay){ if (!handsBox) handsBox = hands.panel(); box.appendChild(handsBox); }
  else box.innerHTML = "<p class='muted' style='margin:0'>No relay is set up yet, so rooms across the internet are closed. Members open in other tabs on this computer still find each other.</p>";
}
window.ChamberNet = { P: P, set: function(p, v){ setP(p, v, true); }, outs: outs, atoms: atoms, revert: revertAll, open: open, hands: function(){ return hands; } };
drawPanel();
})();
