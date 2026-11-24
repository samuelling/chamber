/* Chamber oddities: the other ways a member site goes wrong.
   Loaded after spec.js and before engine.js. Everything here is made from the site's own material
   (its word, its hidden word, its trapped character, its rooms, its counter, its photographs),
   so every site goes wrong in its own voice.

   Glitches: short episodes on any page. The page is possessed, tears, melts, mirrors, swarms,
   goes dark, redacts itself, stutters, miscounts, stares, breathes, sheds its menu.
   Rabbit holes (#hole-…): places that aren't the zoom. A crawl through the basement levels, a staff
   directory whose chain of command comes back round to you, fine print that never ends,
   the site's own history all the way down, and the homepage rotting one floor at a time.

   Try one by hand: ?odd=tear (any glitch name), ?odd=episode, or #hole-corridor-1-1. */
(function(){
"use strict";
var S = window.SITE; if (!S) return;
var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
var $ = function(s, r){ return (r || document).querySelector(s); };
var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

/* ---------- small helpers ---------- */
function rng(seed){ var s = (Math.imul(seed | 0, 2654435761) ^ 0x9E3779B9) >>> 0 || 1; return function(){ s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function hashStr(t){ var h = 2166136261; t = String(t); for (var i = 0; i < t.length; i++){ h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); }
function strip(s){ var d = document.createElement("div"); d.innerHTML = String(s || ""); return (d.textContent || "").replace(/\s+/g, " ").trim(); }
function pick(a, r){ return a.length ? a[Math.floor((r || Math.random)() * a.length)] : ""; }
function shuffle(a, r){ a = a.slice(); r = r || Math.random; for (var i = a.length - 1; i > 0; i--){ var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function cap(s){ s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }
function low(s){ s = String(s || ""); return /^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
function noDot(s){ return String(s || "").replace(/[.!?…]+$/, ""); }
function uniq(a){ var o = []; a.forEach(function(x){ if (x && o.indexOf(x) < 0) o.push(x); }); return o; }
function roman(n){ var v = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1], s = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"], o = ""; for (var i = 0; i < v.length; i++) while (n >= v[i]){ o += s[i]; n -= v[i]; } return o; }

/* ---------- the site's own material ---------- */
var A = S.atoms || {};
var W = (S.word || "it").toLowerCase(), HW = (S.hiddenWord || "help").toLowerCase(), LW = S.levelWord || "Level", NAME = S.name || "Us";
var voiceLines = Object.keys((S.dive && S.dive.voice) || {}).map(function(k){ return S.dive.voice[k]; });
var WHO = (A.who && A.who.name) || (voiceLines[0] && voiceLines[0].split(":")[0]) || "Someone";
var WL = uniq(((A.who && A.who.lines) || []).concat(voiceLines.map(function(v){ return v.replace(/^[^:]{1,40}:\s*/, ""); })).map(strip));
var LINES = uniq((A.lines || []).map(strip));
var WORDS = uniq((A.words || []).concat([W]).map(function(w){ return String(w).toLowerCase(); }));
var CAPS = uniq((A.captions || []).map(strip));
var CL = ((S.counter && S.counter.lines) || []).map(strip);
var SAY = ((S.dive && S.dive.say) || []).map(strip);
var ROOMS = Object.keys(S.rooms || {}).map(function(k){ var R = S.rooms[k]; return { key: k, t: strip(R.t), where: strip(R.where), lede: strip(R.lede) }; });
var EXITS = (S.exits || []).map(strip);
function imgOf(x){ return !x ? "" : x[0] === "@" ? "../engine/img/" + x.slice(1) + ".jpg" : x; }
var IMGS = uniq((A.images || []).concat(((S.posts || []).map(function(p){ return p.img; }))).map(imgOf));
var home = (S.pages || []).filter(function(p){ return p.id === "home"; })[0];
var homeText = (function(){ if (!home) return {}; var d = document.createElement("div"); d.innerHTML = home.html; var h = $("h1", d), l = $(".lede, .poster-sub, .statement-text, p", d); return { h1: h ? strip(h.innerHTML) : NAME, lede: l ? strip(l.innerHTML) : (S.tag || "") }; })();
if (!LINES.length) LINES = [strip(S.tag || NAME)];
if (!WL.length) WL = [HW + "."];
var SHAPE = (S.motif && S.motif.shape) || "";

/* ---------- per-viewer state ---------- */
var KEY = "chamber-odd:" + S.slug, st = { inv: [], holes: {}, n: 0 };
try { var sv = JSON.parse(localStorage.getItem(KEY) || "{}"); for (var k in sv) st[k] = sv[k]; } catch (e) {}
function save(){ try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
function visitorName(){ try { return JSON.parse(localStorage.getItem("chamber:" + S.slug) || "{}").name || ""; } catch (e) { return ""; } }

/* ---------- the motif, drawn small ---------- */
function iconUri(fill, stroke){
  var d = window.Engine && Engine.icon; if (!d) return "";
  return "url(\"data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='-0.5 -0.5 1 1'><path d='" + d + "' fill='" + (fill || (S.motif && S.motif.ink) || "#fff") + "' stroke='" + (stroke || "#111") + "' stroke-width='0.05'/></svg>").replace(/'/g, "%27") + "\")";
}

/* ---------- corrupting words ---------- */
function rotWords(text, p, r){
  r = r || Math.random;
  return String(text).replace(/[A-Za-z’']{3,}/g, function(w){
    if (r() >= p) return w;
    var x = r() < 0.12 ? HW : pick(WORDS, r);
    return w.charAt(0) === w.charAt(0).toUpperCase() ? cap(x) : x;
  });
}
function textNodes(root){
  var out = [], wk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function(n){ return n.nodeValue.trim().length > 2 && !(n.parentNode && n.parentNode.closest && n.parentNode.closest("script,style,.ascii,.net-panel,.chat,.cookie")) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } });
  while (wk.nextNode()) out.push(wk.currentNode);
  return out;
}
function rotTree(root, p, r){ textNodes(root).forEach(function(n){ n.nodeValue = rotWords(n.nodeValue, p, r); }); }

/* =====================================================================
   GLITCHES
   ===================================================================== */
var layer = null, running = [], busyUntil = 0, lastAt = 0, weird = 0, curView = "home", curDepth = 0, bootAt = Date.now();
function ensureLayer(){ if (!layer){ layer = document.createElement("div"); layer.className = "odd-layer"; layer.setAttribute("aria-hidden", "true"); document.body.appendChild(layer); } return layer; }
function view(){ return $(".view.active") || $("main") || document.body; }
function later(fn, ms){ var t = setTimeout(fn, ms); running.push(function(){ clearTimeout(t); }); return t; }
function every(fn, ms){ var t = setInterval(fn, ms); running.push(function(){ clearInterval(t); }); return t; }
function onStop(fn){ running.push(fn); }
/* while something is hanging off the side of the page, the page doesn't get wider */
function clip(){ document.documentElement.classList.add("odd-clip"); onStop(function(){ document.documentElement.classList.remove("odd-clip"); }); }
function stopAll(){ var r = running; running = []; r.forEach(function(f){ try { f(); } catch (e) {} }); busyUntil = 0; }
function textEls(root, sel, max){
  return shuffle($$(sel || "h1,h2,h3,.lede,p,figcaption,blockquote,.eyebrow,li", root).filter(function(e){
    return e.children.length === 0 && e.offsetParent && e.textContent.trim().length > 3 && !e.closest(".net-panel,.chat,.cookie,form,.odd-layer");
  })).slice(0, max || 14);
}
function sayOverlay(text, ms){
  var o = document.createElement("div"); o.className = "odd-say"; o.textContent = text; ensureLayer().appendChild(o);
  requestAnimationFrame(function(){ o.classList.add("on"); });
  later(function(){ o.classList.remove("on"); }, ms || 3000); later(function(){ o.remove(); }, (ms || 3000) + 600);
  onStop(function(){ o.remove(); });
}

var G = {
  /* every heading and line is overwritten with the one word, letter by letter, then given back */
  possess: function(){
    var els = textEls(view(), null, 16); if (!els.length) return 0;
    var orig = els.map(function(e){ return e.textContent; });
    var target = orig.map(function(t, i){ var w = (i === 2 ? HW : W), k = 0; return t.replace(/[A-Za-z]/g, function(ch){ var c = w[k++ % w.length]; return ch === ch.toUpperCase() ? c.toUpperCase() : c; }); });
    var f = 0, dir = 1;
    var tick = every(function(){
      f += dir * 0.06;
      els.forEach(function(e, i){ var n = Math.round(orig[i].length * Math.max(0, Math.min(1, f))); e.textContent = target[i].slice(0, n) + orig[i].slice(n); });
      if (f >= 1.6 && dir > 0) dir = -1;
      if (f <= 0 && dir < 0){ clearInterval(tick); els.forEach(function(e, i){ e.textContent = orig[i]; }); }
    }, 45);
    onStop(function(){ els.forEach(function(e, i){ e.textContent = orig[i]; }); });
    return 3400;
  },
  /* the page tears: it shudders sideways, splits its colour, drops black bars */
  tear: function(){
    document.body.classList.add("odd-tear"); var L = ensureLayer(), bars = [];
    var redo = function(){ bars.forEach(function(b){ b.remove(); }); bars = []; for (var i = 0; i < 4 + Math.floor(Math.random() * 5); i++){ var b = document.createElement("i"); b.className = "odd-bar"; b.style.top = (Math.random() * 100) + "%"; b.style.height = (1 + Math.random() * 7) + "%"; b.style.transform = "translateX(" + ((Math.random() - 0.5) * 30) + "%)"; if (Math.random() < 0.4){ b.textContent = (Math.random() < 0.5 ? HW : W).toUpperCase(); b.classList.add("w"); } L.appendChild(b); bars.push(b); } };
    redo(); var iv = reduced ? 0 : every(redo, 90);
    var end = function(){ clearInterval(iv); document.body.classList.remove("odd-tear"); bars.forEach(function(b){ b.remove(); }); bars = []; };
    later(end, 1100 + Math.random() * 900); onStop(end);
    return 2000;
  },
  /* the page turns round, and the note at the bottom only reads right in a mirror */
  mirror: function(){
    document.body.classList.add("odd-mirror");
    var line = pick(WL); sayOverlay(line.split("").reverse().join(""), 2600);
    var end = function(){ document.body.classList.remove("odd-mirror"); };
    later(end, 2800); onStop(end);
    return 3000;
  },
  /* the page runs down the screen like something left in the sun, then pulls itself back up */
  melt: function(){
    if (reduced) return 0;
    var els = $$("section, .page-head, .room-body, .gallery, figure, .article .body p", view()).filter(function(e){ return e.offsetParent; }).slice(0, 14);
    if (!els.length) return 0;
    clip();
    els.forEach(function(e, i){ e.style.transition = "transform 1.9s cubic-bezier(.55,0,1,.45) " + (i * 0.06 + Math.random() * 0.3).toFixed(2) + "s, filter 1.9s"; e.style.transform = "translateY(" + (120 + Math.random() * 700).toFixed(0) + "px) rotate(" + ((Math.random() - 0.5) * 14).toFixed(1) + "deg) scaleY(" + (1 + Math.random() * 0.5).toFixed(2) + ")"; e.style.filter = "blur(1px)"; });
    var back = function(){ els.forEach(function(e){ e.style.transition = "transform .9s cubic-bezier(.2,1.4,.4,1), filter .9s"; e.style.transform = ""; e.style.filter = ""; }); };
    later(back, 3300); later(function(){ els.forEach(function(e){ e.style.transition = ""; }); }, 4400);
    onStop(function(){ els.forEach(function(e){ e.style.transition = ""; e.style.transform = ""; e.style.filter = ""; }); });
    return 4500;
  },
  /* the motif comes out of the walls, hundreds of it, and crosses the screen */
  swarm: function(){
    if (reduced) return 0;
    var uri = iconUri(); if (!uri) return 0;
    var L = ensureLayer(), n = 70 + Math.floor(Math.random() * 70), side = Math.floor(Math.random() * 4), els = [];
    for (var i = 0; i < n; i++){
      var b = document.createElement("i"); b.className = "odd-bug"; b.style.backgroundImage = uri;
      var s = 14 + Math.random() * 30; b.style.width = b.style.height = s + "px";
      var a = Math.random() * 100, from = [[a, -8], [108, a], [a, 108], [-8, a]][side], to = [[a + (Math.random() - 0.5) * 60, 112], [-12, a + (Math.random() - 0.5) * 60], [a + (Math.random() - 0.5) * 60, -12], [112, a + (Math.random() - 0.5) * 60]][side];
      b.style.setProperty("--x0", from[0] + "vw"); b.style.setProperty("--y0", from[1] + "vh"); b.style.setProperty("--x1", to[0] + "vw"); b.style.setProperty("--y1", to[1] + "vh");
      b.style.animationDuration = (2.2 + Math.random() * 3).toFixed(2) + "s"; b.style.animationDelay = (Math.random() * 1.6).toFixed(2) + "s";
      L.appendChild(b); els.push(b);
    }
    var end = function(){ els.forEach(function(b){ b.remove(); }); };
    later(end, 7000); onStop(end);
    return 6000;
  },
  /* every photograph is replaced by something the site has been keeping, and the captions talk */
  stare: function(){
    var ims = $$(".ph img:not(.swap)", view()).filter(function(i){ return i.offsetParent; }).slice(0, 12);
    if (!ims.length || !IMGS.length) return 0;
    var keep = ims.map(function(i){ return [i, i.getAttribute("src")]; }), caps = $$(".ph figcaption", view()).map(function(c){ return [c, c.textContent]; });
    ims.forEach(function(i, k){ i.setAttribute("src", IMGS[k % IMGS.length]); var f = i.closest(".ph"); if (f) f.classList.add("odd-stare"); });
    caps.forEach(function(c, k){ c[0].textContent = WHO + ": " + WL[k % WL.length]; });
    var end = function(){ keep.forEach(function(x){ x[0].setAttribute("src", x[1]); var f = x[0].closest(".ph"); if (f) f.classList.remove("odd-stare"); }); caps.forEach(function(c){ c[0].textContent = c[1]; }); };
    later(end, 5200); onStop(end);
    return 5400;
  },
  /* the whole page breathes */
  breathe: function(){
    if (reduced) return 0;
    document.body.classList.add("odd-breathe");
    var end = function(){ document.body.classList.remove("odd-breathe"); };
    later(end, 7400); onStop(end);
    return 7500;
  },
  /* the lights go out and someone speaks */
  dark: function(){
    var L = ensureLayer(), o = document.createElement("div"), who = visitorName(), line = pick(WL);
    if (who && Math.random() < 0.5) line = who.toLowerCase() + ". " + line;
    o.className = "odd-dark"; o.innerHTML = "<div><b>" + esc(WHO) + "</b><span></span></div>"; L.appendChild(o);
    var sp = $("span", o), i = 0;
    every(function(){ if (i <= line.length) sp.textContent = line.slice(0, i++); }, 38);
    later(function(){ o.classList.add("off"); }, 3200 + line.length * 20); later(function(){ o.remove(); }, 3900 + line.length * 20);
    onStop(function(){ o.remove(); });
    return 4000 + line.length * 20;
  },
  /* lines are blacked out, and the bars underneath say the hidden word */
  redact: function(){
    var els = textEls(view(), "p,li,.lede,figcaption,h2,h3", 12); if (!els.length) return 0;
    var orig = els.map(function(e){ return e.innerHTML; });
    els.forEach(function(e){
      var r = Math.random, words = e.textContent.split(/(\s+)/);
      e.innerHTML = words.map(function(w){ return /\S/.test(w) && r() < 0.42 ? "<span class='odd-red'><span>" + esc(r() < 0.18 ? HW : w) + "</span></span>" : esc(w); }).join("");
    });
    later(function(){ $$(".odd-red", view()).forEach(function(b){ if (Math.random() < 0.3) b.classList.add("peel"); }); }, 1500);
    var end = function(){ els.forEach(function(e, i){ e.innerHTML = orig[i]; }); };
    later(end, 4600); onStop(end);
    return 4800;
  },
  /* whatever is on screen sticks, and smears down the page like a stuck frame */
  stutter: function(){
    var vh = innerHeight, first = $$("section, .page-head, .room-body, figure, .exits", view()).filter(function(e){ var r = e.getBoundingClientRect(); return e.offsetParent && r.bottom > 60 && r.top < vh * 0.6 && r.height > 80; })[0];
    if (!first) return 0;
    var r = first.getBoundingClientRect(), clones = [], n = 5 + Math.floor(Math.random() * 6), step = (12 + Math.random() * 30) * (Math.random() < 0.3 ? -1 : 1);
    for (var i = 1; i <= n; i++){
      var c = first.cloneNode(true); c.classList.add("odd-stutter"); c.removeAttribute("id"); $$("[id]", c).forEach(function(x){ x.removeAttribute("id"); });
      c.style.cssText += ";position:absolute;margin:0;left:" + (r.left + scrollX) + "px;top:" + (r.top + scrollY) + "px;width:" + r.width + "px;height:" + r.height + "px;z-index:" + (8000 - i) + ";background:var(--bg);opacity:" + (1 - i / (n + 2)).toFixed(2) + ";transform:translate(" + ((i % 2 ? 1 : -1) * i * 2) + "px," + (i * step).toFixed(0) + "px)";
      document.body.appendChild(c); clones.push(c);
    }
    clip();
    var end = function(){ clones.forEach(function(c){ c.remove(); }); };
    later(end, 1700 + Math.random() * 900); onStop(end);
    return 2700;
  },
  /* every number on the page loses count */
  count: function(){
    var nodes = textNodes(view()).filter(function(n){ return /\d/.test(n.nodeValue); }).slice(0, 40); if (!nodes.length) return 0;
    var orig = nodes.map(function(n){ return n.nodeValue; });
    var iv = every(function(){ nodes.forEach(function(n, i){ n.nodeValue = orig[i].replace(/\d/g, function(){ return String(Math.floor(Math.random() * 10)); }); }); }, 60);
    var end = function(){ clearInterval(iv); nodes.forEach(function(n, i){ n.nodeValue = orig[i]; }); };
    later(end, 3200); onStop(end);
    return 3400;
  },
  /* the menu forgets the company and offers the rooms instead (and the links work) */
  menu: function(){
    var links = $$("header.site .nav-links a:not(.btn)"); if (!links.length || !ROOMS.length) return 0;
    var keep = links.map(function(a){ return [a, a.textContent, a.getAttribute("href")]; }), rs = shuffle(ROOMS);
    links.forEach(function(a, i){ var R = rs[i % rs.length]; a.textContent = R.t; a.setAttribute("href", "#room-" + R.key); a.classList.add("odd-menu"); });
    var end = function(){ keep.forEach(function(x){ x[0].textContent = x[1]; x[0].setAttribute("href", x[2]); x[0].classList.remove("odd-menu"); }); };
    later(end, 9000); onStop(end);
    return 2500;
  },
  /* the pointer grows a tail of the motif */
  trail: function(){
    var uri = iconUri(); if (!uri || reduced || !window.matchMedia("(pointer:fine)").matches) return 0;
    var L = ensureLayer(), n = 16, dots = [], pts = [], mx = innerWidth / 2, my = innerHeight / 2;
    for (var i = 0; i < n; i++){ var d = document.createElement("i"); d.className = "odd-tail"; d.style.backgroundImage = uri; var s = 26 - i; d.style.width = d.style.height = s + "px"; L.appendChild(d); dots.push(d); pts.push([mx, my]); }
    var mv = function(e){ mx = e.clientX; my = e.clientY; }; document.addEventListener("mousemove", mv, { passive: true });
    var raf = 0, run = function(){ pts[0][0] += (mx - pts[0][0]) * 0.5; pts[0][1] += (my - pts[0][1]) * 0.5; for (var i = 1; i < n; i++){ pts[i][0] += (pts[i - 1][0] - pts[i][0]) * 0.42; pts[i][1] += (pts[i - 1][1] - pts[i][1]) * 0.42; } dots.forEach(function(d, i){ d.style.transform = "translate(" + (pts[i][0] + 6) + "px," + (pts[i][1] + 6) + "px) rotate(" + (i * 23) + "deg)"; }); raf = requestAnimationFrame(run); };
    run();
    var end = function(){ cancelAnimationFrame(raf); document.removeEventListener("mousemove", mv); dots.forEach(function(d){ d.remove(); }); };
    later(end, 12000); onStop(end);
    return 2000;
  },
  /* for a moment, the page admits what it is */
  confess: function(){
    var h = $$("h1, .poster-text h1, .hero h1", view()).filter(function(e){ return e.offsetParent && e.children.length === 0; })[0];
    var line = pick(LINES.concat(SAY)); if (!h || !line) return 0;
    var keep = h.textContent; h.textContent = noDot(line) + "."; h.classList.add("odd-confess");
    var end = function(){ h.textContent = keep; h.classList.remove("odd-confess"); };
    later(end, 2600); onStop(end);
    return 2800;
  }
};
var NAMES = Object.keys(G);

function glitch(name){
  stopAll();
  var f = G[name] || G[pick(NAMES)];
  var ms = 0; try { ms = f() || 0; } catch (e) { ms = 0; }
  if (!ms && !G[name]){ for (var i = 0; i < 4 && !ms; i++){ try { ms = G[pick(NAMES)]() || 0; } catch (e2) {} } }
  lastAt = Date.now(); busyUntil = lastAt + ms;
  st.n = (st.n || 0) + 1; save();
  return ms;
}

/* an episode: several in a row, and then the page splits open somewhere you can step through */
function episode(){
  stopAll();
  /* only one of the ones that rewrite text, so their undo steps can't tangle */
  var TEXT = ["possess", "redact", "count", "confess", "stare"], tx = pick(TEXT);
  var seq = [tx].concat(shuffle(NAMES.filter(function(n){ return TEXT.indexOf(n) < 0; })).slice(0, 2 + Math.floor(Math.random() * 3))), t = 0;
  seq = shuffle(seq);
  busyUntil = Date.now() + 60000;
  seq.forEach(function(n){ later(function(){ try { G[n](); } catch (e) {} }, t); t += 1600 + Math.random() * 1400; });
  later(function(){ rift(); busyUntil = Date.now() + 15000; }, t + 600);
}
function rift(){
  var L = ensureLayer(), o = document.createElement("div"), r = Math.random;
  var pts = [], x = -2, y = 30 + r() * 40; while (x < 104){ pts.push(x.toFixed(1) + "," + y.toFixed(1)); x += 3 + r() * 7; y += (r() - 0.5) * 9; }
  var hole = pick(Object.keys(H)), href = "#hole-" + entryOf(hole);
  o.className = "odd-rift"; o.innerHTML = "<svg viewBox='0 0 100 100' preserveAspectRatio='none'><polyline points='" + pts.join(" ") + "'/></svg><a href='" + href + "'>" + esc(pick(["There’s a gap in the page. Go through.", "The page has split. Something is on the other side.", "Step through the " + W + ".", "A way down has opened."])) + "</a>";
  L.appendChild(o); requestAnimationFrame(function(){ o.classList.add("on"); });
  var end = function(){ o.remove(); };
  later(end, 16000); onStop(end);
  $("a", o).addEventListener("click", end);
}

/* when to go wrong */
function chance(){ return (curView.indexOf("hole") === 0 ? 0.22 : 0) + 0.035 + curDepth * 0.07 + weird * 0.6; }
function maybe(onArrive){
  var now = Date.now();
  if (now < busyUntil || now - lastAt < 9000 || now - bootAt < 6000) return;
  var c = chance() * (onArrive ? 1 : 0.6);
  if (Math.random() < (0.012 + curDepth * 0.02 + weird * 0.25) * (onArrive ? 1 : 0.5)) return episode();
  if (Math.random() < c) later(function(){ glitch(); }, onArrive ? 1200 + Math.random() * 4000 : 0);
}
setInterval(function(){ if (!document.hidden) maybe(false); }, 14000);

/* =====================================================================
   RABBIT HOLES  (#hole-<kind>-…)
   ===================================================================== */
function entryOf(kind){ return { corridor: "corridor-" + (1 + Math.floor(Math.random() * 9999)) + "-1", staff: "staff-1", terms: "terms-1-" + (1 + Math.floor(Math.random() * 999)), archive: "archive-0", basement: "basement-1" }[kind]; }
function head(eyebrow, h1, lede){ return "<div class='page-head'><span class='eyebrow'>" + eyebrow + "</span><h1>" + h1 + "</h1>" + (lede ? "<p class='lede'>" + lede + "</p>" : "") + "</div>"; }

var H = {
  /* ---- the crawl: a dungeon under the company, rooms built from its own words ---- */
  corridor: function(rest, box){
    var seed = +rest[0] || 1, step = Math.max(1, +rest[1] || 1), r = rng(seed * 977 + step * 131), c = Math.min(0.5, (step - 1) * 0.028);
    var ADJ = ["Long", "Low", "Wet", "Narrow", "Warm", "Second", "Lower", "Other", "Quiet", "Last", "Sealed", "Flooded", "Unlit", "Ribbed", "Tiled", "Sloping", "Humming", "Padded", "Damp", "Older"];
    var PLACE = ["Corridor", "Gallery", "Stair", "Cell", "Annex", "Vault", "Passage", "Landing", "Crawlspace", "Sump", "Ward", "Hall", "Cistern", "Gutter", "Chute", "Antechamber", "Oubliette", "Store"];
    var title = "The " + pick(ADJ, r) + " " + pick(PLACE, r) + (r() < 0.5 ? " of " + cap(pick(WORDS, r)) + "s" : "");
    var R = ROOMS.length ? pick(ROOMS, r) : { where: NAME, t: "", lede: "" };
    var F = [
      function(){ return "The walls are lined with " + pick(WORDS, r) + "s, floor to ceiling."; },
      function(){ return "It smells of " + pick(WORDS, r) + " and wet stone."; },
      function(){ return CL.length ? "Somewhere ahead: " + low(noDot(pick(CL, r))) + "." : "Somewhere ahead, something is being counted."; },
      function(){ return "A brass plaque, polished by hands: “" + noDot(pick(LINES, r)) + ".”"; },
      function(){ return CAPS.length ? "On the floor, a label: " + noDot(pick(CAPS, r)) + "." : "On the floor, a label with your name on it."; },
      function(){ return "Someone has scratched “" + noDot(pick(WL, r)) + "” into the plaster, low down, as if from a kneeling position."; },
      function(){ return "The " + pick(WORDS, r) + " here is warm."; },
      function(){ return "Your footsteps arrive a moment after you do."; },
      function(){ return "A water stain on the ceiling has the shape of the " + (SHAPE || W) + "."; },
      function(){ return R.lede ? noDot(R.lede) + ". Or something very like it." : "It is very like a room you have seen upstairs."; },
      function(){ return "A sign points back the way you came: " + cap(R.where || NAME) + ", " + (step + 2) + " floors up."; },
      function(){ return "There are " + (3 + Math.floor(r() * 40)) + " doors here. All of them are the same door."; },
      function(){ return "A drawer in the wall is labelled " + HW.toUpperCase() + ". It is locked from the inside."; },
      function(){ return "Fluorescent tubes flicker in the rhythm of a heartbeat that isn’t yours."; },
      function(){ return "The carpet gives way to " + pick(WORDS, r) + ". Then to carpet again."; },
      function(){ return step > 3 ? "You have been here before. The " + pick(WORDS, r) + " is where you left it." : "This is further than the brochures go."; },
      function(){ return "A notice: staff beyond this point must be accompanied by " + WHO + "."; }
    ];
    var lines = shuffle(F, r).slice(0, 3 + Math.floor(r() * 3)).map(function(f){ return rotWords(f(), c, r); });
    var item = null;
    if (step % 4 === 3 && r() < 0.85){
      item = pick(["a jar of " + pick(WORDS, r) + "s", WHO + "’s " + pick(WORDS, r), "a key labelled " + HW, "a name badge that says " + NAME + " · Visitor", "a " + pick(WORDS, r) + " in a padded envelope", "a torn page: “" + noDot(pick(LINES, r)) + "”", "a lanyard, still warm"], r);
      if (st.inv.indexOf(item) < 0){ st.inv.push(item); if (st.inv.length > 7) st.inv.shift(); save(); }
      lines.push("You find " + item + ". You take it. It seems to want to come.");
    } else if (st.inv.length && r() < 0.4) lines.push("Your " + pick(st.inv, r).replace(/^(a|an) /, "") + " is heavier than it was.");
    /* the map: always a little wrong */
    var map = [], Wd = 9, Ht = 5, doors = { n: r() < 0.8, e: r() < 0.8, s: r() < 0.8, w: r() < 0.8 }, y, x;
    for (y = 0; y < Ht; y++){ var row = ""; for (x = 0; x < Wd; x++){ var edge = y === 0 || y === Ht - 1 || x === 0 || x === Wd - 1, ch = edge ? "█" : (r() < 0.06 + c * 0.4 ? pick(["▒", "·", HW[0]], r) : "·");
      if (y === 0 && x === 4 && doors.n) ch = " "; if (y === Ht - 1 && x === 4 && doors.s) ch = " "; if (x === 0 && y === 2 && doors.w) ch = " "; if (x === Wd - 1 && y === 2 && doors.e) ch = " ";
      if (y === 2 && x === 4) ch = "@"; if (step > 6 && y === 1 && x === 6 + (step % 2)) ch = "@"; row += ch; } map.push(row); }
    var labels = shuffle(EXITS.length ? EXITS : ["Onward", "Down", "Left", "Through"], r);
    var dirs = [["North", "n"], ["East", "e"], ["South", "s"], ["West", "w"]].filter(function(d){ return doors[d[1]]; });
    if (!dirs.length) dirs = [["Down", "s"]];
    var back = Math.floor(r() * dirs.length);
    var exits = dirs.map(function(d, i){ var to = i === back && step > 2 && r() < 0.5 ? "corridor-" + seed + "-" + (step - 1) : "corridor-" + (hashStr(seed + d[1] + step) % 99991) + "-" + (step + 1); return ["<b>" + d[0] + "</b> · " + (labels[i] || "on"), "#hole-" + to]; });
    if (step % 6 === 0) exits.push(["<b>A door marked with the " + esc(SHAPE || W) + "</b>", "#hole-" + entryOf(pick(["staff", "terms", "archive", "basement"], r))]);
    if (step >= 9 && r() < 0.5 && ROOMS.length) exits.push(["<b>A stair, up</b> · " + esc(pick(ROOMS, r).t), "#room-" + pick(ROOMS, r).key]);
    var photo = r() < 0.35 && IMGS.length ? "<figure class='ph r169 odd-dim'><img src='" + esc(pick(IMGS, r)) + "' alt=''><figcaption>" + esc(rotWords(pick(CAPS.length ? CAPS : LINES, r), c, r)) + "</figcaption></figure>" : "";
    box.innerHTML = head(LW + " B" + step + " · below " + esc(R.where || NAME), esc(rotWords(title, c * 0.5, r)), "") +
      "<div class='odd-crawl'><div class='odd-crawl-text'>" + lines.map(function(t){ return "<p>" + esc(t) + "</p>"; }).join("") + photo +
      "<nav class='exits' aria-label='Ways on'>" + exits.map(function(e){ return "<a class='exit' href='" + e[1] + "'>" + e[0] + "</a>"; }).join("") + "</nav>" +
      "<p class='room-up'><a href='#home'>&uarr; Back to the surface</a></p></div>" +
      "<aside class='odd-crawl-side'><pre class='ascii odd-map' aria-label='A map of this room'>" + esc(map.join("\n")) + "</pre><p class='mono muted'>" + LW + " B" + step + (step > 6 ? " · two of you on the map" : "") + "</p>" +
      (st.inv.length ? "<h4>Carrying</h4><ul class='odd-inv'>" + st.inv.map(function(i){ return "<li>" + esc(i) + "</li>"; }).join("") + "</ul>" : "") + "</aside></div><div style='height:80px'></div>";
    return Math.min(4, 2 + Math.floor(step / 3));
  },

  /* ---- the staff directory: everyone who works here, and whom they answer to ---- */
  staff: function(rest, box){
    var FIRST = ["Alex", "Jordan", "Morgan", "Casey", "Riley", "Avery", "Quinn", "Dana", "Robin", "Leslie", "Kim", "Pat", "Drew", "Hayden", "Marion", "Shannon", "Terry", "Jamie", "Sidney", "Frances", "Kerry", "Lou", "Jo", "Rowan"];
    var LAST = ["Hale", "Marsh", "Pike", "Vane", "Holt", "Crane", "Dunn", "Wick", "Rowe", "Stone", "Mott", "Pell", "Shaw", "Kerr", "Lowe", "Finch", "Hart", "Bell", "Voss", "Grey", "Ash", "Lake", "Moss", "Reed"];
    var RANK = ["Senior", "Associate", "Principal", "Junior", "Acting", "Former", "Interim", "Permanent", "Deputy", "Chief", "Night", "Honorary"];
    var ROLE = ["Lead", "Coordinator", "Specialist", "Officer", "Steward", "Keeper", "Liaison", "Analyst", "Custodian", "Witness", "Attendant", "Counter"];
    var STATUS = ["Active", "Active", "Active", "On leave", "Unreachable", "Still here", "Reassigned downward", "Below", "Do not contact", "In the building"];
    function person(id){
      if (id === 0) return { id: 0, name: WHO, title: "Head of " + cap(W), since: "before records began", where: (ROOMS[0] && ROOMS[0].t) || "Below", status: "Still here", boss: "you" };
      var r = rng(id * 7919 + 17);
      return { id: id, name: pick(FIRST, r) + " " + pick(LAST, r), title: pick(RANK, r) + " " + cap(pick(WORDS, r)) + " " + pick(ROLE, r), since: String(1952 + Math.floor(r() * 74) - (r() < 0.15 ? 80 : 0)), where: ROOMS.length ? pick(ROOMS, r).t : NAME, status: r() < 0.2 && CL.length ? cap(noDot(pick(CL, r))) : pick(STATUS, r), boss: Math.floor(id / 6) };
    }
    function av(p){ var ini = p.name.split(/\s+/).map(function(w){ return w[0]; }).join("").slice(0, 2).toUpperCase(); return "<span class='odd-av' style='--h:" + (hashStr(p.name) % 360) + "'>" + esc(p.id === 0 ? HW[0].toUpperCase() : ini) + "</span>"; }
    var a = rest[0] || "1";
    if (a === "you" || a.charAt(0) === "p"){
      var me = a === "you", id = me ? -1 : +a.slice(1) || 0, p;
      if (me){ var nm = visitorName(); p = { id: -1, name: nm || "You", title: "New starter", since: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), where: "Here", status: "Still here", boss: 0 }; }
      else p = person(id);
      var r2 = rng(id * 31 + 7), bio = me ? [WHO + " asked for you by name.", "Your desk is ready. It has been ready for some time.", noDot(pick(WL, r2)) + "."]
        : shuffle(LINES.concat(CL), r2).slice(0, 3).map(function(l){ return noDot(l) + "."; }).concat(id === 0 ? ["Has never taken a day off. Has never left."] : []);
      var bossHref = p.boss === "you" ? "#hole-staff-you" : "#hole-staff-p" + p.boss, bossName = p.boss === "you" ? (visitorName() || "You") : person(p.boss).name;
      var reports = id >= 0 ? [1, 2, 3, 4, 5, 6].map(function(k){ return id * 6 + k; }).filter(function(k){ return k !== id; }).slice(0, 3 + (id % 3)) : [];
      box.innerHTML = "<div class='page-head'><span class='eyebrow'>Staff directory · " + esc(NAME) + " · internal</span></div>" +
        "<div class='odd-profile'>" + av(p) + "<div><h1>" + esc(p.name) + "</h1><p class='lede'>" + esc(p.title) + "</p>" +
        "<dl><dt>Employee no.</dt><dd>" + (me ? "pending" : String(100000 + p.id * 37).slice(-6)) + "</dd><dt>Started</dt><dd>" + esc(p.since) + "</dd><dt>Location</dt><dd>" + esc(p.where) + "</dd><dt>Status</dt><dd>" + esc(p.status) + "</dd><dt>Reports to</dt><dd><a href='" + bossHref + "'>" + esc(bossName) + "</a></dd></dl>" +
        bio.map(function(b){ return "<p>" + esc(b) + "</p>"; }).join("") +
        (reports.length ? "<h4>Direct reports</h4><ul class='odd-reports'>" + reports.map(function(k){ var q = person(k); return "<li><a href='#hole-staff-p" + k + "'>" + esc(q.name) + "</a> · " + esc(q.title) + "</li>"; }).join("") + "</ul>" : "") +
        "<p class='room-up'><a href='#hole-staff-1'>&larr; All staff</a></p></div></div><div style='height:80px'></div>";
      return me || id === 0 ? 4 : 3;
    }
    var pg = Math.max(1, +a || 1), rows = [];
    for (var i = 0; i < 12; i++){ var pid = (pg - 1) * 12 + i + 1, q = person(pid); if (pg > 3 && i === 7) q = person(0); rows.push(q); }
    box.innerHTML = head("Internal · staff directory", "Everyone at " + esc(noDot(NAME)) + ".", "Search is disabled. Everyone is listed. Page " + pg + " of &infin;.") +
      "<div class='container'><table class='odd-staff'><thead><tr><th></th><th>Name</th><th>Role</th><th>Since</th><th>Status</th></tr></thead><tbody>" +
      rows.map(function(q){ return "<tr><td>" + av(q) + "</td><td><a href='#hole-staff-p" + q.id + "'>" + esc(pg > 6 ? rotWords(q.name, Math.min(0.6, pg * 0.05)) : q.name) + "</a></td><td>" + esc(q.title) + "</td><td class='mono'>" + esc(q.since) + "</td><td>" + esc(q.status) + "</td></tr>"; }).join("") +
      "</tbody></table><p class='odd-pager'>" + (pg > 1 ? "<a href='#hole-staff-" + (pg - 1) + "'>&larr; Previous</a>" : "<span></span>") + "<span class='mono'>Page " + pg + " of &infin;</span><a href='#hole-staff-" + (pg + 1) + "'>Next &rarr;</a></p></div><div style='height:80px'></div>";
    return pg > 5 ? 3 : 2;
  },

  /* ---- the fine print: every clause has a footnote, every footnote is smaller ---- */
  terms: function(rest, box){
    var lv = Math.max(1, +rest[0] || 1), seed = +rest[1] || 1, r = rng(seed * 104729 + lv);
    if (lv >= 10){
      box.innerHTML = "<div class='odd-end'><p class='mono'>Schedule " + roman(lv) + " · the last clause</p><h1>" + esc(HW) + "</h1><p>You have read all of the terms. You agreed to all of them.</p><p><a class='btn btn-ghost' href='#legal'>Back to Legal</a></p></div>";
      return 4;
    }
    var WHOS = ["The Member", "The Visitor", "You", "Your household", "The Undersigned", "Anyone reading this", "The Reader, by scrolling,", "Your next of kin"];
    var VERBS = ["agrees that", "acknowledges that", "consents to the fact that", "waives any claim that", "accepts that", "understands that", "will not dispute that", "has already agreed that"];
    var OBJ = LINES.concat(WL, CL).map(function(l){ return low(noDot(l)); }).concat(["the " + W + " is not returned", WHO + " may remain on the premises", "this clause continues in a smaller size", "scrolling constitutes consent", "the " + HW + " clause cannot be read at normal size"]);
    var n = 6 + Math.floor(r() * 4), size = Math.max(5, 17 * Math.pow(0.8, lv - 1));
    var num = function(i){ var a = []; for (var k = 1; k < lv; k++) a.push(1 + (hashStr(seed + "" + k) % 9)); a.push(i + 1); return a.join("."); };
    var cls = [];
    for (var i = 0; i < n; i++){ var foot = "#hole-terms-" + (lv + 1) + "-" + ((seed * 7 + i * 13) % 9973 + 1); cls.push("<p><b>" + num(i) + "</b> " + esc(pick(WHOS, r)) + " " + esc(pick(VERBS, r)) + " " + esc(pick(OBJ, r)) + ".<sup><a href='" + foot + "'>" + (i + 1) + "</a></sup></p>"); }
    box.innerHTML = head("Legal · supplementary terms", "Schedule " + roman(lv) + (lv > 1 ? ", footnote " + (seed % 9 + 1) : "") + ".", lv === 1 ? "These terms supplement the terms. Each footnote is binding, and continues below." : "") +
      "<div class='container'><div class='odd-terms' style='font-size:" + size.toFixed(2) + "px;letter-spacing:" + (lv > 5 ? "-0.02em" : "0") + "'>" + cls.join("") + "</div>" +
      "<p class='room-up'><a href='" + (lv > 1 ? "#hole-terms-" + (lv - 1) + "-" + seed : "#legal") + "'>&uarr; Up one schedule</a></p></div><div style='height:80px'></div>";
    return lv < 3 ? 2 : lv < 6 ? 3 : 4;
  },

  /* ---- the archive: this site, as it used to look, further and further back ---- */
  archive: function(rest, box){
    var ERAS = ["2011", "1999", "1987", "1952", "1897", "before"], i = Math.max(0, Math.min(ERAS.length - 1, +rest[0] || 0)), era = ERAS[i], r = rng(i * 13 + hashStr(NAME));
    var nav = "<p class='odd-era-nav'>" + (i > 0 ? "<a href='#hole-archive-" + (i - 1) + "'>&larr; Newer</a>" : "<a href='#home'>&larr; Today</a>") + "<span>" + (era === "before" ? "…" : era) + "</span>" + (i < ERAS.length - 1 ? "<a href='#hole-archive-" + (i + 1) + "'>Older &rarr;</a>" : "<a href='#home'>Now &rarr;</a>") + "</p>";
    var L3 = shuffle(LINES, r).slice(0, 3), who = WHO, out = "";
    if (era === "2011"){
      out = "<div class='era era-2011'><header><b>" + esc(NAME) + "</b><span class='beta'>beta</span><nav><a href='#home'>Home</a><a href='#hole-archive-1'>About us</a><a href='#hole-staff-1'>Our team</a></nav></header>" +
        "<div class='hero2011'><h1>" + esc(homeText.h1 || NAME) + "</h1><p>" + esc(homeText.lede || "") + "</p><a class='glossy' href='#hole-corridor-2011-1'>Get started free!</a></div>" +
        "<div class='cols'>" + L3.map(function(l, k){ return "<div><h3>" + cap(WORDS[k % WORDS.length]) + " 2.0</h3><p>" + esc(l) + "</p></div>"; }).join("") + "</div>" +
        "<p class='small'>&copy; 2011 " + esc(NAME) + ". Now with " + esc(W) + " sharing.</p></div>";
    } else if (era === "1999"){
      var hits = (S.counter ? S.counter.start : 41000) % 99991;
      out = "<div class='era era-1999' style='--tile:" + iconUri() + "'><table><tr><td class='side'><p>&#9658; <a href='#home'>HOME</a></p><p>&#9658; <a href='#hole-archive-2'>OLD STUFF</a></p><p>&#9658; <a href='#hole-corridor-1999-1'>DUNGEON</a></p><p>&#9658; <a href='#hole-staff-1'>STAFF</a></p></td><td>" +
        "<h1>Welcome to " + esc(NAME) + "!!!</h1><p class='blink'>NEW!</p><div class='marq'><span>" + esc(L3.join("  ***  ")) + "</span></div>" +
        "<p class='uc'>&#9888; UNDER CONSTRUCTION &#9888;</p><p>You are visitor number <b class='ctr'>" + String(hits).padStart(6, "0") + "</b></p>" +
        "<h3>Sign my guestbook!</h3>" + shuffle(WL, r).slice(0, 4).map(function(l, k){ return "<p class='gb'><b>" + (k === 1 ? esc(who) : pick(["webmaster", "guest", "anon", "ANON", "kid99"], r)) + "</b> wrote on 0" + (k + 3) + "/1" + k + "/99: " + esc(l) + "</p>"; }).join("") +
        "<p class='small'>Best viewed at 800x600. Made with Notepad.</p></td></tr></table></div>";
    } else if (era === "1987"){
      var sys = NAME.toUpperCase().slice(0, 26), bar = new Array(sys.length + 11).join("═");
      out = "<div class='era era-1987'><pre>CONNECT 2400\n\n╔" + bar + "╗\n║   " + esc(sys) + " BBS   ║\n╚" + bar + "╝\n\nSysop: " + esc(who.toUpperCase()) + "      Node 1 of 1      Callers today: " + (3 + Math.floor(r() * 9)) + "\n\n" +
        L3.map(function(l, k){ return "  MSG #" + (100 + k * 37) + "  " + esc(l.toUpperCase()); }).join("\n") + "\n\n</pre><p class='menu'><a href='#hole-archive-1'>[N]ewer</a> <a href='#hole-archive-3'>[O]lder</a> <a href='#hole-corridor-1987-1'>[D]oors</a> <a href='#hole-staff-p0'>[T]alk to sysop</a> <a href='#home'>[G]oodbye</a></p><pre class='cursor'>Your choice? _</pre></div>";
    } else if (era === "1952"){
      out = "<div class='era era-1952'><p class='memo-h'>INTER-OFFICE MEMORANDUM</p><p>TO: All staff<br>FROM: " + esc(who) + "<br>RE: " + esc(HW.toUpperCase()) + "<br>DATE: " + (3 + Math.floor(r() * 25)) + " March 1952</p><hr>" +
        L3.map(function(l){ var ws = l.split(" "); return "<p>" + ws.map(function(w, k){ return k === 2 && ws.length > 4 ? "<s>" + esc(w) + "</s> " + esc(W) : esc(w); }).join(" ") + "</p>"; }).join("") +
        "<p>This memorandum is not to leave the building. Neither is anyone who has read it.</p><p class='stamp'>CONFIDENTIAL</p><p class='sig'>" + esc(who) + "</p></div>";
    } else if (era === "1897"){
      out = "<div class='era era-1897'><p class='ledger-h'>" + esc(NAME) + " &middot; Day Book &middot; 1897</p>" +
        shuffle(CL.concat(LINES), r).slice(0, 7).map(function(l, k){ return "<p><span class='d'>" + (k * 3 + 2) + " Nov.</span> " + esc(noDot(l)) + " <span class='amt'>" + (1 + Math.floor(r() * 40)) + "s. " + Math.floor(r() * 12) + "d.</span></p>"; }).join("") +
        "<p class='sig'>Witnessed, " + esc(who) + "</p></div>";
    } else {
      out = "<div class='era era-before'><i class='odd-big-mark' style='background-image:" + iconUri() + "'></i><p>" + esc(HW) + "</p></div>";
    }
    box.innerHTML = "<div class='container'>" + nav + out + nav + "</div><div style='height:60px'></div>";
    return [2, 2, 3, 3, 4, 4][i];
  },

  /* ---- the basement: the homepage again, a floor lower each time, and worse ---- */
  basement: function(rest, box){
    var n = Math.max(1, +rest[0] || 1), r = rng(n * 4099 + hashStr(NAME));
    var bar = "<div class='odd-404'><span class='mono'>404 &middot; This page has moved down. Sub-basement B" + n + ".</span><span><a href='" + (n > 1 ? "#hole-basement-" + (n - 1) : "#home") + "'>&uarr; Back up</a> <a href='#hole-basement-" + (n + 1) + "'>Further down &darr;</a></span></div>";
    if (n >= 8){
      var cells = []; for (var q = 0; q < 180; q++) cells.push(r() < 0.06 ? "<i style='background-image:" + iconUri() + "'></i>" : "<span>" + (r() < 0.1 ? esc(HW) : esc(W)) + "</span>");
      box.innerHTML = bar + "<div class='odd-floor-end'>" + cells.join("") + "</div>" + bar;
      return 4;
    }
    var d = document.createElement("div"); d.className = "odd-rot-copy"; d.innerHTML = home ? home.html : "";
    $$("form, input, textarea, select, script, [data-chart], .ticker, .marquee", d).forEach(function(x){ x.remove(); });
    $$("[id]", d).forEach(function(x){ x.removeAttribute("id"); });
    rotTree(d, Math.min(0.75, n * 0.11), r);
    var secs = $$(":scope > section", d);
    if (n >= 3 && secs.length > 2){ var sh = shuffle(secs, r); sh.forEach(function(s){ d.appendChild(s); }); }
    if (n >= 4) secs.forEach(function(s){ if (r() < 0.35) s.parentNode.insertBefore(s.cloneNode(true), s); });
    $$("img", d).forEach(function(im, k){ var t = []; if (n >= 2) t.push(k % 2 ? "scaleY(-1)" : "scaleX(-1)"); im.style.transform = t.join(" "); if (n >= 2) im.style.filter = ["invert(1) hue-rotate(180deg)", "grayscale(1) contrast(1.6)", "sepia(1) saturate(3)", "blur(2px)"][k % 4]; });
    d.style.transform = n >= 3 ? "rotate(" + ((r() - 0.5) * n * 0.7).toFixed(2) + "deg)" : "";
    if (n >= 5) d.classList.add("dark");
    box.innerHTML = bar; box.appendChild(d); box.insertAdjacentHTML("beforeend", bar);
    return Math.min(4, 2 + Math.floor(n / 2));
  }
};

function render(id, box){
  var parts = String(id).split("-"), kind = parts.shift(), f = H[kind];
  if (!f || !box) return false;
  stopAll();
  var d = f(parts, box) || 2;
  st.holes[kind] = (st.holes[kind] || 0) + 1; save();
  return d;
}

/* ---------- doors into the holes, left about the site ---------- */
function doors(view, el){
  if (!el) return;
  if (view === "legal" && !$(".odd-door", el)){
    var c = $(".container", el) || el; var p = document.createElement("p"); p.className = "odd-door";
    p.innerHTML = "Supplementary terms apply. <a href='#hole-" + entryOf("terms") + "'>Read schedule I</a>."; c.appendChild(p);
  }
  if (view === "notfound" && !$(".odd-door", el)){
    var row = $("p:last-of-type", el) || el; var a = document.createElement("a"); a.className = "btn btn-ghost odd-door"; a.href = "#hole-basement-1"; a.textContent = "Look downstairs"; row.appendChild(a);
  }
  if (view === "room" && Math.random() < 0.3){
    var ex = $(".exits", el); if (ex && !$(".odd-door", ex)){
      var k = pick(["corridor", "corridor", "staff", "basement", "archive"]), t = { corridor: "A door marked " + LW + " B1", staff: "The staff stairs", basement: "Down past the error page", archive: "A door with an old sign on it" }[k];
      var x = document.createElement("a"); x.className = "exit odd-door"; x.href = "#hole-" + entryOf(k); x.textContent = t; ex.appendChild(x);
    }
  }
}
(function footDoors(){
  var tries = 0, t = setInterval(function(){
    var fine = $("footer.site .fine"); if (!fine && ++tries < 40) return; clearInterval(t); if (!fine || $(".odd-foot", fine)) return;
    var s = document.createElement("span"); s.className = "odd-foot"; s.innerHTML = "<a href='#hole-staff-1'>Staff login</a> &middot; <a href='#hole-archive-0'>Site history</a>"; fine.appendChild(s);
  }, 100);
})();

/* ---------- called by the router after every page change ---------- */
function onRoute(v, depth){
  stopAll();
  curView = v === "hole" ? "hole-" : v; curDepth = depth || 0;
  doors(v, view());
  maybe(true);
}

/* ---------- by hand: ?odd=<glitch>|episode|rift ---------- */
(function(){
  var m = /[?&]odd=([a-z]+)/.exec(location.search); if (!m) return;
  bootAt = 0;
  setTimeout(function(){ if (m[1] === "episode") episode(); else if (m[1] === "rift") rift(); else glitch(m[1]); }, 1200);
})();

window.Oddities = {
  render: render, onRoute: onRoute, glitch: glitch, episode: episode, rift: rift, list: NAMES, holes: Object.keys(H),
  setWeird: function(v){ weird = Math.max(0, Math.min(1, +v || 0)); }
};
})();
