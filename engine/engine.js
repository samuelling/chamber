/* Chamber engine: one script for every member site.
   A site describes itself in window.SITE (site.js); this file builds the shell,
   routes between pages, deepens the site as you go down, and runs the rooms,
   the ASCII, the hidden specks and the endless bottom. */
(function(){
"use strict";
var S = window.SITE;
var $ = function(s, r){ return (r || document).querySelector(s); };
var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
var NS = "http://www.w3.org/2000/svg";

/* ---------- small helpers ---------- */
function rng(seed){
  var s = (Math.imul(seed | 0, 2654435761) ^ 0x9E3779B9) >>> 0 || 1;
  return function(){ s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function hashStr(t){ var h = 2166136261; for (var i = 0; i < t.length; i++){ h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function shuffle(a, r){ a = a.slice(); for (var i = a.length - 1; i > 0; i--){ var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
function clean(s){ return (s || "").trim().replace(/[<>&"]/g, "").slice(0, 40); }
function svgUri(svg){ return "url(\"data:image/svg+xml," + encodeURIComponent(svg) + "\")"; }

/* ---------- per-viewer state: kept only for convenience ---------- */
var KEY = "chamber:" + S.slug;
var state = { seen: 0, name: "", rooms: 0, posts: 6, cookie: 0 };
try { var saved = JSON.parse(localStorage.getItem(KEY) || "{}"); for (var k in saved) state[k] = saved[k]; } catch (e) {}
function save(){ try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

/* ---------- the shell ---------- */
function shell(){
  var logo = "<svg viewBox='0 0 26 26' aria-hidden='true'><path d='" + S.logo + "' fill='currentColor'/></svg>";
  var nav = S.nav.map(function(n){ return "<a href='" + n[0] + "'>" + n[1] + "</a>"; }).join("");
  var head = document.createElement("header"); head.className = "site";
  head.innerHTML = "<div class='container nav'><a class='brand' href='#home' style='color:var(--brand,var(--text))'>" + logo + esc(S.name) + "</a>" +
    "<button class='menu-btn' id='menu-btn' aria-expanded='false' aria-controls='nav-links'>Menu</button>" +
    "<nav class='nav-links' id='nav-links'>" + nav + "<a href='" + S.cta[0] + "' class='btn btn-primary btn-sm'>" + S.cta[1] + "</a></nav></div>";
  document.body.insertBefore(head, document.body.firstChild);
  var main = $("main");
  S.pages.forEach(function(p){
    var v = document.createElement("div"); v.className = "view"; v.setAttribute("data-view", p.id);
    v.innerHTML = p.html; main.appendChild(v);
  });
  ["article", "room", "hole"].forEach(function(id){
    var v = document.createElement("div"); v.className = "view"; v.setAttribute("data-view", id);
    v.innerHTML = "<div class='container' id='" + id + "'></div>"; main.appendChild(v);
  });
  var foot = document.createElement("footer"); foot.className = "site";
  foot.innerHTML = "<div class='container'><div class='foot-grid'><div><a class='brand' href='#home'>" + logo + esc(S.name) + "</a><p id='foot-tag' style='margin-top:12px'>" + S.tag + "</p></div>" +
    S.footer.map(function(c){ return "<div><h4>" + c.h + "</h4><ul>" + c.links.map(function(l){ return "<li><a href='" + l[0] + "'>" + l[1] + "</a></li>"; }).join("") + "</ul></div>"; }).join("") +
    "</div><div class='fine'>" + S.fine.map(function(f){ return "<span>" + f + "</span>"; }).join("") +
    "<span>A member of the <a href='../'>Chamber</a>. " + S.name + " is a work of satire; see <a href='#legal'>clause 7</a>.</span></div></div>";
  document.body.appendChild(foot);
  var extra = document.createElement("div");
  extra.innerHTML = "<div class='cookie" + (state.cookie ? " off" : "") + "' id='cookie' role='dialog' aria-label='Cookie preferences'><p>" + S.cookie.text + "</p><div class='row'><button class='btn btn-primary btn-sm' id='c-yes'>" + S.cookie.yes + "</button><button class='btn btn-ghost btn-sm' id='c-no'>" + S.cookie.no + "</button></div></div>" +
    "<button class='btn btn-primary chat-btn' id='chat-btn' aria-expanded='false' aria-controls='chat'>" + S.chat.button + "</button>" +
    "<div class='chat' id='chat' role='dialog' aria-label='Chat'><div class='chat-head'><div>" + S.chat.name + "<small>" + S.chat.role + "</small></div><button id='chat-close' aria-label='Close chat'>&times;</button></div><div class='chat-log' id='chat-log' aria-live='polite'></div><div class='chat-opts' id='chat-opts'></div></div>" +
    "<div class='toast' id='toast' role='status' aria-live='polite'></div>";
  while (extra.firstChild) document.body.appendChild(extra.firstChild);
}

/* ---------- toast, cookie, chat ---------- */
var toastTimer;
function toast(msg){ var t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastTimer); toastTimer = setTimeout(function(){ t.classList.remove("on"); }, 3800); }
function wireChrome(){
  $("#c-yes").addEventListener("click", function(){ state.cookie = 1; save(); $("#cookie").classList.add("off"); toast(S.cookie.yesToast); });
  $("#c-no").addEventListener("click", function(){ state.cookie = 1; save(); $("#cookie").classList.add("off"); toast(S.cookie.noToast); });
  var started = false;
  function say(text, who){ var m = document.createElement("div"); m.className = "msg " + who; m.textContent = text; var l = $("#chat-log"); l.appendChild(m); l.scrollTop = l.scrollHeight; }
  function step(key){
    var node = S.chat.flow[key];
    node.bot.forEach(function(t){ say(t.replace("{name}", state.name || "there"), "bot"); });
    $("#chat-opts").innerHTML = "";
    node.opts.forEach(function(o){
      var b = document.createElement("button"); b.className = "chip"; b.textContent = o[0];
      b.addEventListener("click", function(){ say(o[0], "me"); step(o[1]); });
      $("#chat-opts").appendChild(b);
    });
  }
  function toggle(open){ $("#chat").classList.toggle("on", open); $("#chat-btn").setAttribute("aria-expanded", String(open)); if (open && !started){ started = true; step("start"); } }
  $("#chat-btn").addEventListener("click", function(){ toggle(!$("#chat").classList.contains("on")); });
  $("#chat-close").addEventListener("click", function(){ toggle(false); });
  $("#menu-btn").addEventListener("click", function(){ var o = $("#nav-links").classList.toggle("open"); this.setAttribute("aria-expanded", String(o)); });
}

/* ---------- forms: every one stays on the page ---------- */
function wireForms(){
  $$("form[data-form]").forEach(function(f){
    f.addEventListener("submit", function(e){
      e.preventDefault();
      var data = {};
      $$("input,select", f).forEach(function(i){ data[i.id] = i.type === "checkbox" ? i.checked : clean(i.value); });
      if (data.name) { state.name = data.name; save(); }
      var out = $("#" + f.getAttribute("data-form") + "-result");
      out.innerHTML = S.forms[f.getAttribute("data-form")](data, state) + "<p class='aside'>This form does not send anything anywhere. See <a href='#legal'>clause 7</a>.</p>";
      out.classList.add("on"); f.style.display = "none"; hideSpecks();
    });
  });
}

/* ---------- the motif, drawn as a single path ---------- */
function polysToPath(polys){
  var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  polys.forEach(function(p){ p.forEach(function(q){ if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }); });
  var sc = 0.96 / Math.max(x1 - x0, y1 - y0), mx = (x0 + x1) / 2, my = (y0 + y1) / 2, path = new Path2D(), d = "";
  polys.forEach(function(p){
    var area = 0, j, m = p.length;
    for (j = 0; j < m; j++){ var a = p[j], b = p[(j + 1) % m]; area += a[0] * b[1] - b[0] * a[1]; }
    if (area < 0) p = p.slice().reverse();
    for (j = 0; j < m; j++){ var X = (p[j][0] - mx) * sc, Y = (p[j][1] - my) * sc; if (j) path.lineTo(X, Y); else path.moveTo(X, Y); d += (j ? "L" : "M") + X.toFixed(3) + " " + Y.toFixed(3); }
    path.closePath(); d += "Z";
  });
  return { path: path, d: d };
}
function xf(polys, sc, rot, tx, ty){
  var c = Math.cos(rot) * sc, s = Math.sin(rot) * sc;
  return polys.map(function(p){ return p.map(function(q){ return [q[0] * c - q[1] * s + tx, q[0] * s + q[1] * c + ty]; }); });
}
var foreign = null;   /* a sibling's motif, set by the network */
var shapes = {};
function shapeOf(n){
  if (shapes[n]) return shapes[n];
  if (foreign && n % 2 === 1) return (shapes[n] = { path: new Path2D(foreign), d: foreign });
  var r = rng(n * 7919 + 13), w = n <= 2 ? 0 : Math.min(1, (n - 2) / 8), polys = S.motif.polys(n, r, w), i, k, a;
  var kind = n < 4 ? 0 : Math.floor(r() * Math.min(6, n - 2));
  if (kind === 1) polys = xf(polys, 0.85, -0.14, -0.27, 0).concat(xf(S.motif.polys(n + 101, r, w), 0.85, 0.14, 0.27, 0.03));
  else if (kind === 2){ k = 6 + Math.floor(r() * 7); var ring = []; for (i = 0; i < k; i++){ a = (i / k) * Math.PI * 2; ring = ring.concat(xf(polys, 0.45, a - Math.PI / 2, Math.cos(a) * 0.62, Math.sin(a) * 0.62)); } polys = ring; }
  else if (kind === 3) polys = polys.concat(xf(polys, 0.78, (r() - 0.5) * 0.3, 0, -0.5), xf(polys, 0.58, (r() - 0.5) * 0.5, 0, -0.9));
  else if (kind === 4){ k = 2 + Math.floor(r() * 4); var small = S.motif.polys(n + 202, r, w); for (i = 0; i < k; i++){ var sd = i % 2 ? 1 : -1; polys = polys.concat(xf(small, 0.36 + r() * 0.1, sd * (1.1 + r() * 1.2), sd * 0.3, -0.3 + r() * 0.3)); } }
  else if (kind === 5) polys = polys.concat(xf(polys, 1, Math.PI, (r() - 0.5) * 0.2, 0.75 + r() * 0.3));
  return (shapes[n] = polysToPath(polys));
}
var ICON = polysToPath(S.motif.polys(1, rng(14), 0));
function iconSvg(fill, stroke, size){ return "<svg xmlns='http://www.w3.org/2000/svg' viewBox='-0.5 -0.5 1 1' width='" + (size || 26) + "' height='" + (size || 26) + "'><path d='" + ICON.d + "' fill='" + fill + "' stroke='" + stroke + "' stroke-width='0.05'/></svg>"; }
(function(){
  var tile = function(a){ return svgUri("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60'><g fill='" + S.motif.ink + "' fill-opacity='" + a + "'><path transform='translate(16 16) rotate(-20) scale(22)' d='" + ICON.d + "'/><path transform='translate(44 42) rotate(24) scale(18)' d='" + ICON.d + "'/></g></svg>"); };
  var root = document.documentElement.style;
  root.setProperty("--motif-tile", tile(0.05)); root.setProperty("--motif-tile-2", tile(0.11));
  root.setProperty("--motif-cursor", svgUri(iconSvg(S.motif.ink, "#111", 28)) + " 14 4");
})();

/* ---------- specks: the motif hidden in every photograph ---------- */
var extraSpeck = null;   /* the network can slip a sibling's icon in too */
function hideSpecks(){
  $$(".ph").forEach(function(f){
    if (f.getAttribute("data-t")) return;
    var img = $("img", f); if (!img) return;
    f.setAttribute("data-t", "1");
    var w = document.createElement("div"); w.className = "zw";
    img.parentNode.insertBefore(w, img); w.appendChild(img);
    if (img.style.transformOrigin){ w.style.transformOrigin = img.style.transformOrigin; img.style.transformOrigin = ""; }
    var r = rng(hashStr(img.getAttribute("src") || "")), spots = [], i;
    for (i = 0; i < 7; i++) spots.push([6 + r() * 88, 8 + r() * 82]);
    var o = (w.style.transformOrigin || "").match(/([\d.]+)%\s+([\d.]+)%/);
    if (o) for (i = 0; i < 4; i++) spots.push([+o[1] + (r() - 0.5) * 5, +o[2] + (r() - 0.5) * 5]);
    var uri = svgUri(iconSvg(S.motif.ink, "#2a2420"));
    spots.forEach(function(p){
      var s = document.createElement("i"); s.className = "speck";
      s.style.left = p[0].toFixed(2) + "%"; s.style.top = p[1].toFixed(2) + "%";
      s.style.width = s.style.height = (0.5 + r() * 0.4).toFixed(2) + "%";
      s.style.transform = "rotate(" + Math.round((r() - 0.5) * 120) + "deg)"; s.style.backgroundImage = uri;
      w.appendChild(s);
    });
    if (extraSpeck){ var e = document.createElement("i"); e.className = "speck foreign"; e.style.left = (10 + r() * 78) + "%"; e.style.top = (12 + r() * 70) + "%"; e.style.width = e.style.height = "0.8%"; e.style.backgroundImage = extraSpeck; w.appendChild(e); }
    var swap = f.getAttribute("data-swap");
    if (o && swap){ var sw = document.createElement("img"); sw.className = "swap"; sw.src = swap; sw.alt = ""; sw.style.left = o[1] + "%"; sw.style.top = o[2] + "%"; w.appendChild(sw); }
  });
}
document.addEventListener("mousemove", function(e){
  var f = e.target.closest && e.target.closest(".ph");
  if (!f || f.classList.contains("zoom")) return;
  var w = $(".zw", f); if (!w) return;
  var b = f.getBoundingClientRect();
  w.style.transformOrigin = ((e.clientX - b.left) / b.width * 100).toFixed(1) + "% " + ((e.clientY - b.top) / b.height * 100).toFixed(1) + "%";
}, { passive: true });
document.addEventListener("click", function(e){ var z = e.target.closest && e.target.closest(".ph"); if (z) z.classList.toggle("in"); });

/* ---------- insights ---------- */
function postDepth(i){ return S.posts[i].depth || 1; }
function renderPosts(){
  var box = $("[data-posts]"); if (!box) return;
  box.innerHTML = S.posts.slice(0, state.posts).map(function(p, i){
    return "<a class='post" + (postDepth(i) > 1 ? " deep" : "") + "' href='#post-" + p.slug + "'><div class='thumb'><img src='" + p.img + "' alt='" + esc(p.alt) + "' loading='lazy'></div><div class='in'><span class='tag'>" + p.tag + "</span><h3>" + p.title + "</h3><p>" + p.ex + "</p><small>" + p.read + " · " + p.by + "</small></div></a>";
  }).join("");
  var b = $("[data-more]"); if (!b) return;
  var done = state.posts >= S.posts.length;
  b.textContent = done ? S.postsDone : "Load more posts"; b.disabled = done; b.style.opacity = done ? 0.6 : 1;
}
document.addEventListener("click", function(e){
  if (e.target.matches && e.target.matches("[data-more]")){ state.posts = Math.min(S.posts.length, state.posts + 3); save(); renderPosts(); }
});
var articleDepth = 1;
function renderArticle(slug){
  var i = -1; S.posts.forEach(function(p, k){ if (p.slug === slug) i = k; });
  if (i < 0) return false;
  var p = S.posts[i], prev = S.posts[i - 1], next = S.posts[i + 1];
  articleDepth = postDepth(i);
  if (state.posts < i + 1){ state.posts = Math.min(S.posts.length, Math.ceil((i + 1) / 3) * 3); save(); renderPosts(); }
  $("#article").className = "container article";
  $("#article").innerHTML = "<a href='#insights' style='text-decoration:none;font-weight:600;font-size:14px;color:var(--accent-ink,var(--accent))'>&larr; All insights</a>" +
    "<div style='margin-top:26px'><span class='eyebrow'>" + p.tag + "</span></div><h1>" + p.title + "</h1><p class='byline'>" + p.by + " · " + p.read + "</p>" +
    "<figure class='ph r169" + (articleDepth > 1 ? " deep" : "") + "'><img src='" + p.img + "' alt='" + esc(p.alt) + "'></figure>" +
    "<div class='body'>" + p.body.map(function(t){ return "<p>" + t + "</p>"; }).join("") + "</div>" +
    "<div class='article-nav'>" + (prev ? "<a class='btn btn-ghost' href='#post-" + prev.slug + "'>&larr; " + prev.title + "</a>" : "<span></span>") +
    (next ? "<a class='btn btn-ghost' href='#post-" + next.slug + "'>Next: " + next.title + " &rarr;</a>" : "<a class='btn btn-ghost' href='" + S.lastPostExit[0] + "'>" + S.lastPostExit[1] + " &rarr;</a>") + "</div>";
  return true;
}

/* ---------- ASCII ---------- */
var Ascii = {
  /* the motif spelled out in the obsession's own word, with one small word that isn't it */
  motif: function(n, word, hidden){
    var path = shapeOf(n).path, W = 76, H = 38, c = document.createElement("canvas"), x, y, k = 0, lines = [], ins = [];
    c.width = c.height = 400; var p = c.getContext("2d"); p.setTransform(380, 0, 0, 380, 200, 200);
    for (y = 0; y < H; y++){ var row = []; for (x = 0; x < W; x++) row.push(p.isPointInPath(path, ((x + 0.5 - W / 2) / W) * 380 + 200, (((y + 0.5) - H / 2) * 2 / W) * 380 + 200)); ins.push(row); }
    var hy = -1, hx = -1, need = hidden.length + 8;
    for (y = Math.round(H * 0.5); y < H && hy < 0; y++) for (x = 0; x < W - need; x++){ var ok = true; for (var q = 0; q < need; q++) if (!ins[y][x + q]) ok = false; if (ok){ hy = y; hx = x + 4; break; } }
    for (y = 0; y < H; y++){
      var line = "";
      for (x = 0; x < W; x++){
        if (!ins[y][x]){ line += " "; continue; }
        if (y === hy && x >= hx && x < hx + hidden.length){ line += "<span class='h'>" + hidden[x - hx] + "</span>"; k++; continue; }
        var edge = !(ins[y - 1] && ins[y - 1][x]) || !(ins[y + 1] && ins[y + 1][x]) || !ins[y][x - 1] || !ins[y][x + 1], ch = word[k++ % word.length];
        line += edge ? ch.toUpperCase() : ch;
      }
      lines.push(line.replace(/\s+$/, ""));
    }
    while (lines.length && !lines[0]) lines.shift();
    while (lines.length && !lines[lines.length - 1]) lines.pop();
    return lines.join("\n");
  },
  /* a field of glyphs that drifts, with a message spelled through it */
  field: function(cfg){
    var rows = 30, cols = 84, base = [], y, x;
    for (y = 0; y < rows; y++){ var set = cfg.sets[y % cfg.sets.length], s = ""; for (x = 0; x < cols; x++) s += set[Math.floor(Math.random() * set.length)]; base.push(s); }
    return function(f){
      var out = [];
      for (var y = 0; y < rows; y++){
        var sh = (y % 3 === 0 ? f : y % 3 === 1 ? -f : 0), line = [];
        for (var x = 0; x < cols; x++) line.push(esc(base[y][((x + sh) % cols + cols) % cols]));
        cfg.msg.forEach(function(m){ if (m[0] !== y) return; for (var k = 0; k < m[2].length; k++) if (m[2][k] !== " ") line[m[1] + k * 2] = "<span class='h'>" + m[2][k] + "</span>"; });
        out.push(line.join(""));
      }
      return out.join("\n");
    };
  }
};

/* ---------- rooms ---------- */
var roomTimer = null;
function stopRoom(){ if (roomTimer){ clearInterval(roomTimer); roomTimer = null; } }
function renderRoom(slug){
  var R = S.rooms[slug]; if (!R) return false;
  stopRoom(); state.rooms = (state.rooms || 0) + 1; save();
  var r = Math.random, order = S.roomOrder, i = order.indexOf(slug), next = order[(i + 1) % order.length];
  var labels = shuffle(S.exits, r), others = shuffle(order.filter(function(s){ return s !== slug && s !== next; }), r);
  var exits = [[R.ring || labels[0], "#room-" + next]];
  for (var k = 0; k < 3 && k < others.length; k++) exits.push([labels[k + 1], "#room-" + others[k]]);
  if (r() < 0.45) exits.push(S.special[Math.floor(r() * S.special.length)]);
  exits = shuffle(exits, r);
  var media = R.gallery ? "<div class='gallery'>" + R.gallery.map(function(g){ return "<figure class='ph r43'><img src='" + g[0] + "' alt='" + esc(g[1]) + "'><figcaption>" + g[2] + "</figcaption></figure>"; }).join("") + "</div>"
    : R.img ? "<figure class='ph " + (R.ar || "r45") + "'><img src='" + R.img + "' alt='" + esc(R.alt) + "'><figcaption>" + R.cap + "</figcaption></figure>"
    : "<div><pre class='ascii' id='ascii' role='img' aria-label='" + esc(R.alt) + "'></pre>" + (R.ascii === "motif" ? "<p style='margin-top:12px;display:flex;gap:12px;align-items:center;flex-wrap:wrap'><button class='btn btn-ghost btn-sm' id='closer'>Look closer</button><span class='mono muted' id='motif-n'>1 of &infin;</span></p>" : "") + "</div>";
  var body = (typeof R.body === "function" ? R.body(state) : R.body).map(function(t){ return "<p>" + t + "</p>"; }).join("");
  $("#room").innerHTML = "<div class='page-head'><span class='eyebrow'>" + S.levelWord + " " + (3 + state.rooms) + " · " + R.where + "</span><h1>" + R.t + "</h1><p class='lede'>" + R.lede + "</p></div>" +
    "<div class='room-body" + (R.img ? " split" : "") + "'>" + media + "<div class='room-text'>" + body +
    "<nav class='exits' aria-label='Ways on'>" + exits.map(function(e){ return "<a class='exit' href='" + e[1] + "'>" + e[0] + "</a>"; }).join("") + "</nav>" +
    "<p class='room-up'><a href='" + S.up[0] + "'>&uarr; " + S.up[1] + "</a></p></div></div><div style='height:80px'></div>";
  if (R.ascii) startAscii(R);
  return true;
}
function startAscii(R){
  var pre = $("#ascii"), f = 0, tick = null;
  if (R.ascii === "motif"){
    var n = 1; pre.innerHTML = Ascii.motif(n, S.word, S.hiddenWord || "help");
    $("#closer").addEventListener("click", function(){ n++; pre.innerHTML = Ascii.motif(n, S.word, S.hiddenWord || "help"); $("#motif-n").textContent = n + " of ∞" + (n > 4 ? ". It's getting worse." : ""); });
  } else if (R.ascii === "field"){ var fld = Ascii.field(S.field); tick = function(){ pre.innerHTML = fld(f++); }; }
  else if (typeof R.ascii === "function"){ if (R.anim) tick = function(){ pre.innerHTML = R.ascii(f++, state); }; else pre.innerHTML = R.ascii(0, state); }
  if (tick){ tick(); if (!reduced) roomTimer = setInterval(tick, R.speed || 160); }
}

/* ---------- the counter that only goes up ---------- */
var count = S.counter ? S.counter.start : 0, countTimer = null;
function startCount(){
  if (countTimer || !S.counter) return;
  countTimer = setInterval(function(){
    count++;
    $$("[data-count]").forEach(function(el){ el.textContent = count.toLocaleString("en-US"); });
    var log = $("[data-count-log]");
    if (log){ var d = new Date(), p = document.createElement("p"); p.innerHTML = "<b>" + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) + "</b> · +1 · " + S.counter.lines[count % S.counter.lines.length]; log.insertBefore(p, log.firstChild); while (log.children.length > 5) log.removeChild(log.lastChild); }
  }, S.counter.every || 7000);
}
function stopCount(){ clearInterval(countTimer); countTimer = null; }

/* ---------- the endless bottom ---------- */
var Dive = null;
function makeDive(){
  var cv = $("#dive"); if (!cv) return null;
  var track = $("#dive-track"), stage = cv.parentNode, ctx = cv.getContext("2d");
  var probeC = document.createElement("canvas"); probeC.width = probeC.height = 400;
  var probe = probeC.getContext("2d"); probe.setTransform(100, 0, 0, 100, 200, 200);
  var LVL = 1300, SPAN = 12, HEAD = 66, SP = 512, SOLID = 160, M = 1.16, LO = 300, HI = 520;
  var W = 0, H = 0, dpr = 1, base = 0, cur = 0, want = 0, raf = 0, on = false, shown = -1, hudN = -1, pinned = false, levels = {};
  var PAL = S.motif.palette, lastY = 0, speed = 0;
  function rgb(c, m){ m = m == null ? 1 : m; return "rgb(" + Math.min(255, Math.round(c[0] * m)) + "," + Math.min(255, Math.round(c[1] * m)) + "," + Math.min(255, Math.round(c[2] * m)) + ")"; }
  function colOf(n){ if (n < PAL.length) return PAL[n]; var r = rng(n * 53 + 1); return PAL[2 + Math.floor(r() * (PAL.length - 2))]; }
  function levelOf(n){
    if (levels[n]) return levels[n];
    var r = rng(n * 104729 + 7), w = n <= 1 ? 0 : Math.min(1, (n - 1) / 8), sh = n === 0 ? null : shapeOf(n), cells, x, y, i, row, col;
    var inside = n === 0 ? function(px, py){ return Math.abs(px) < 1.06 && Math.abs(py) < 0.66; } : function(px, py){ return probe.isPointInPath(sh.path, px * 100 + 200, py * 100 + 200); };
    var kind = n === 0 ? S.motif.trayKind : n === 1 ? 0 : 1 + Math.floor(r() * 7);
    var d = n === 0 ? S.motif.trayStep : (1 / 13) * (0.92 + r() * 0.3), tries = 0;
    var tx = (r() - 0.5) * (n === 0 ? 0.5 : 0.16), ty = (r() - 0.5) * (n === 0 ? 0.3 : 0.16);
    do {
      cells = []; row = 0;
      if (kind === 3){ for (i = 0; i < 900; i++){ var rad = d * 0.62 * Math.sqrt(i), an = i * 2.39996; if (rad > 0.8) break; cells.push({ x: rad * Math.cos(an), y: rad * Math.sin(an), s: d, r: an + Math.PI / 2 }); } }
      else {
        var lx = n === 0 ? 1.1 : 0.56, ly = n === 0 ? 0.7 : 0.56, step = kind === 6 ? d * 0.82 : kind === 5 ? d * 1.1 : d;
        for (y = -ly; y <= ly; y += step, row++){
          col = 0;
          for (x = -lx + (kind === 1 && row % 2 ? step / 2 : 0); x <= lx; x += step, col++){
            var c = { x: x, y: y, s: step * 0.98, r: 0 };
            if (kind === 1) c.r = row % 2 ? Math.PI : 0;
            else if (kind === 2) c.r = Math.atan2(x, -y);
            else if (kind === 4){ c.y += 0.045 * Math.sin(x * 11 + row * 0.9); c.r = 0.45 * Math.cos(x * 11 + row * 0.9); }
            else if (kind === 5){ c.r = ((row + col) % 2) * Math.PI / 2; c.s = step * 1.05; }
            else if (kind === 6){ c.x += (r() - 0.5) * step; c.y += (r() - 0.5) * step; c.r = r() * Math.PI * 2; c.s = step * (1.15 + r() * 0.9); }
            else if (kind === 7){ c.x += (r() - 0.5) * step * 0.5; c.y += (r() - 0.5) * step * 0.5; var dd = Math.hypot(c.x - tx, c.y - ty); c.r = Math.atan2(tx - c.x, -(ty - c.y)); c.s = step * (1 + 0.9 * Math.exp(-dd * dd * 30)); }
            if (n > 1){ c.x += (r() - 0.5) * w * 0.35 * step; c.y += (r() - 0.5) * w * 0.35 * step; c.r += (r() - 0.5) * w * 0.7; c.s *= 1 + (r() - 0.5) * w * 0.5; }
            cells.push(c);
          }
        }
      }
      cells = cells.filter(function(q){ return inside(q.x, q.y); });
      d *= 0.7;
    } while (cells.length < 14 && ++tries < 4);
    if (!cells.length) cells = [{ x: 0, y: 0, s: 0.2, r: 0 }];
    if (n > 0){ var sx = 0, sy = 0; cells.forEach(function(q){ sx += q.x; sy += q.y; }); tx = sx / cells.length + (r() - 0.5) * 0.06; ty = sy / cells.length + (r() - 0.5) * 0.06; }
    var best = 0, bd = 1e9;
    cells.forEach(function(q, k){ q.f = 0.74 + r() * 0.26; var e = (q.x - tx) * (q.x - tx) + (q.y - ty) * (q.y - ty); if (e < bd){ bd = e; best = k; } });
    var tc = cells.splice(best, 1)[0]; tc.r = Math.atan2(Math.sin(tc.r), Math.cos(tc.r)); tc.f = 1; cells.push(tc);
    var colr = colOf(n), lum = colr[0] * 0.3 + colr[1] * 0.6 + colr[2] * 0.1;
    var gap = n === 0 ? S.motif.trayGap : (S.motif.gapMode === "dark" || (S.motif.gapMode !== "light" && lum > 100)) ? [colr[0] * 0.5, colr[1] * 0.45, colr[2] * 0.43] : [colr[0] * 0.3 + 170, colr[1] * 0.3 + 158, colr[2] * 0.3 + 146];
    return (levels[n] = { n: n, shape: sh, cells: cells, target: tc, col: colr, gapCss: rgb(gap), sprite: null, solid: null });
  }
  function sprites(lv){
    if (lv.sprite) return;
    var c = document.createElement("canvas"), g = c.getContext("2d"), child = shapeOf(lv.n + 1), cc = rgb(colOf(lv.n + 1));
    c.width = c.height = SP; g.translate(SP / 2, SP / 2); g.scale(SP / M, SP / M); g.lineJoin = "round";
    if (lv.n > 0){ g.lineWidth = 0.024; g.strokeStyle = "rgba(0,0,0,.6)"; g.stroke(lv.shape.path); g.fillStyle = lv.gapCss; g.fill(lv.shape.path); if (S.motif.inside) S.motif.inside(g, lv.n); }
    lv.cells.forEach(function(q){
      g.save(); g.translate(q.x, q.y); g.rotate(q.r); g.scale(q.s, q.s);
      g.globalAlpha = 1; g.lineWidth = 0.09; g.strokeStyle = "rgba(0,0,0,.5)"; g.stroke(child.path);
      g.globalAlpha = q.f; g.fillStyle = cc; g.fill(child.path); g.restore();
    });
    lv.sprite = c;
    var s = document.createElement("canvas"), h = s.getContext("2d"); h.lineJoin = "round";
    s.width = s.height = SOLID; h.translate(SOLID / 2, SOLID / 2); h.scale(SOLID / M, SOLID / M);
    if (lv.n > 0){ h.lineWidth = 0.09; h.strokeStyle = "rgba(0,0,0,.5)"; h.stroke(lv.shape.path); h.fillStyle = rgb(lv.col); h.fill(lv.shape.path); }
    lv.solid = s;
  }
  function blit(lv, a, b, c, d, e, f, scale, alpha){
    sprites(lv);
    ctx.setTransform(a * dpr, b * dpr, c * dpr, d * dpr, e * dpr, f * dpr);
    if (scale < 260){ ctx.globalAlpha = alpha; ctx.drawImage(lv.solid, -M / 2, -M / 2, M, M); }
    if (scale > 110){ ctx.globalAlpha = alpha * Math.min(1, (scale - 110) / 150); ctx.drawImage(lv.sprite, -M / 2, -M / 2, M, M); }
  }
  function draw(n, a, b, c, d, e, f, scale, depth, shade, force){
    var R = scale * (n === 0 ? 1.4 : 0.84);
    if (e + R < 0 || e - R > W || f + R < 0 || f - R > H) return;
    var lv = levelOf(n);
    if (!force && (scale <= LO || depth > 5)){ blit(lv, a, b, c, d, e, f, scale, shade); return; }
    ctx.setTransform(a * dpr, b * dpr, c * dpr, d * dpr, e * dpr, f * dpr);
    ctx.globalAlpha = 1; ctx.fillStyle = lv.gapCss;
    if (n === 0) ctx.fillRect(-1.3, -0.9, 2.6, 1.8);
    else { ctx.lineWidth = 6 / scale; ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.stroke(lv.shape.path); ctx.fill(lv.shape.path); if (S.motif.inside) S.motif.inside(ctx, n); }
    var cells = lv.cells, i, q, cr, sr;
    for (i = 0; i < cells.length; i++){
      q = cells[i]; cr = Math.cos(q.r) * q.s; sr = Math.sin(q.r) * q.s;
      draw(n + 1, a * cr + c * sr, b * cr + d * sr, c * cr - a * sr, d * cr - b * sr, a * q.x + c * q.y + e, b * q.x + d * q.y + f, scale * q.s, depth + 1, q.f, false);
    }
    if (!force && scale < HI) blit(lv, a, b, c, d, e, f, scale, shade * (1 - (scale - LO) / (HI - LO)));
  }
  function fit(n){ return n === 0 ? Math.max(W / 2.15, H / 1.38) : Math.max(W, H) * 1.05; }
  function sup(k){ return String(k).split("").map(function(ch){ return "⁰¹²³⁴⁵⁶⁷⁸⁹".charAt(+ch); }).join(""); }
  function sayAt(n){
    var v = S.dive.voice;
    if (v[n]) return [v[n], 1];
    if (n > 27 && n % 9 === 0) return [S.dive.still, 1];
    if (n < S.dive.say.length) return [S.dive.say[n], 0];
    return [new Array(Math.min(n - S.dive.say.length + 2, 14)).join(S.dive.chant + " ") + S.dive.chant, 0];
  }
  function render(D){
    if (!W) return;
    var n = Math.floor(D), t = D - n, lv = levelOf(n), tc = lv.target;
    var k0 = fit(n), k1 = fit(n + 1) / tc.s, k = k0 * Math.pow(k1 / k0, t), th = -tc.r * t, u = 1 - Math.pow(1 - t, 2.2);
    var a = Math.cos(th) * k, b = Math.sin(th) * k, c = -b, d = a;
    var e = W / 2 - (a * tc.x + c * tc.y) + k0 * tc.x * (1 - u), f = H / 2 - (b * tc.x + d * tc.y) + k0 * tc.y * (1 - u), scale = k, root = n, m;
    for (m = n - 1; m >= Math.max(0, n - 2); m--){
      var pc = levelOf(m).target, cr = Math.cos(-pc.r) / pc.s, sr = Math.sin(-pc.r) / pc.s;
      var a2 = a * cr + c * sr, b2 = b * cr + d * sr, c2 = c * cr - a * sr, d2 = d * cr - b * sr;
      e -= a2 * pc.x + c2 * pc.y; f -= b2 * pc.x + d2 * pc.y; a = a2; b = b2; c = c2; d = d2; scale /= pc.s; root = m;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    ctx.fillStyle = root > 0 ? levelOf(root - 1).gapCss : "#070605"; ctx.fillRect(0, 0, cv.width, cv.height);
    draw(root, a, b, c, d, e, f, scale, 0, 1, true);
    for (var key in levels) if (+key < root - 1 || +key > n + 5){ delete levels[key]; delete shapes[key]; }
    if (n !== hudN){
      hudN = n;
      $("#dive-depth").textContent = n === 0 ? S.dive.top : S.dive.unit + " " + n + " of ∞ · 10" + sup(Math.floor(D * 1.11)) + "× closer";
      var said = sayAt(n), sayEl = $("#dive-say"), door = $("#dive-door");
      sayEl.textContent = said[0]; sayEl.classList.toggle("voice", !!said[1]);
      if (n >= 2 && n % 4 === 2){ door.setAttribute("href", "#room-" + S.roomOrder[(n * 7) % S.roomOrder.length]); door.hidden = false; } else door.hidden = true;
    }
  }
  function size(){
    var w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    dpr = Math.min(2, window.devicePixelRatio || 1); W = w; H = h;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    track.style.height = (SPAN * LVL + h) + "px"; shown = -1;
  }
  function frame(){
    raf = 0; if (!on || pinned) return;
    if (!W) size();
    var p = -(track.getBoundingClientRect().top - HEAD) / LVL;
    if (p > 9){ window.scrollBy({ top: -6 * LVL, behavior: "instant" }); base += 6; p -= 6; }
    else if (p < 2 && base > 0){ window.scrollBy({ top: 6 * LVL, behavior: "instant" }); base -= 6; p += 6; }
    want = base + Math.max(0, Math.min(SPAN - 0.01, p));
    cur += (want - cur) * (reduced ? 1 : 0.22);
    if (Math.abs(want - cur) < 0.0004) cur = want;
    if (cur !== shown){ render(cur); shown = cur; }
    if (cur !== want) raf = requestAnimationFrame(frame);
  }
  function kick(){ if (on && !raf) raf = requestAnimationFrame(frame); var y = window.scrollY; speed = speed * 0.8 + Math.min(1, Math.abs(y - lastY) / 400) * 0.2; lastY = y; }
  window.addEventListener("scroll", kick, { passive: true });
  window.addEventListener("resize", function(){ if (on){ size(); kick(); } });
  $("#dive-out").addEventListener("click", function(){ base = 0; cur = want = 0; shown = -1; window.scrollTo({ top: 0, behavior: "instant" }); });
  return {
    start: function(){ on = true; pinned = false; size(); kick(); },
    stop: function(){ on = false; },
    shape: function(n){ return shapeOf(n).path; },
    flush: function(){ levels = {}; shown = -1; kick(); },
    level: function(){ return cur; },
    speed: function(){ return speed; },
    peek: function(D){ on = true; pinned = true; size(); var t0 = performance.now(); render(D); return performance.now() - t0; }
  };
}

/* ---------- once you have been downstairs, upstairs is different ---------- */
function applySeen(){
  if (!state.seen) return;
  document.body.classList.add("seen");
  $$("[data-seen-src]").forEach(function(im){ var s = im.getAttribute("data-seen-src"); if (im.getAttribute("src") !== s) im.setAttribute("src", s); });
  $$("[data-seen-text]").forEach(function(el){ el.textContent = el.getAttribute("data-seen-text"); });
  $$("[data-zoom]").forEach(function(z){ z.classList.add("in"); });
  if (S.onSeen) S.onSeen();
}

/* ---------- router ---------- */
var views = [], depthOf = {}, depthNow = 0, forcedDepth = 0;
S.pages.forEach(function(p){ depthOf[p.id] = p.depth; });
depthOf.room = 4;
function route(first){
  var h = (location.hash || "").replace("#", "") || "home", view = h, anchor = null;
  if (S.anchors && S.anchors[h]){ view = S.anchors[h]; anchor = h; }
  else if (h.indexOf("post-") === 0) view = renderArticle(h.slice(5)) ? "article" : "notfound";
  else if (h.indexOf("room-") === 0) view = renderRoom(h.slice(5)) ? "room" : "notfound";
  else if (h.indexOf("hole-") === 0){ var hd = window.Oddities && Oddities.render(h.slice(5), $("#hole")); view = hd ? "hole" : "notfound"; if (hd) depthOf.hole = hd; }
  else if (h === "article" || h === "room" || h === "hole") view = "notfound";
  if (!views.some(function(v){ return v.dataset.view === view; })) view = "notfound";
  var d = view === "article" ? articleDepth : depthOf[view];
  depthNow = d;
  document.body.setAttribute("data-depth", Math.max(d, forcedDepth));
  views.forEach(function(v){ v.classList.toggle("active", v.dataset.view === view); });
  var navKey = view === "article" ? "insights" : view;
  $$(".nav-links a").forEach(function(a){ a.classList.toggle("active", a.getAttribute("href") === "#" + navKey && !a.classList.contains("btn")); });
  $("#nav-links").classList.remove("open");
  if (Dive){ if (view === S.dive.view) Dive.start(); else Dive.stop(); }
  if (S.counter && view === S.counter.view) startCount(); else stopCount();
  if (view !== "room") stopRoom();
  if (d >= 3 && !state.seen){ state.seen = 1; save(); }
  if (d < 3) applySeen();
  if (S.onRoute) S.onRoute(view, state);
  if (window.Oddities) try { Oddities.onRoute(view, d); } catch (e) {}
  hideSpecks();
  if (anchor){ var t = $("[data-anchor='" + anchor + "']"); if (t) t.scrollIntoView(); }
  else if (first !== true) window.scrollTo(0, 0);
}

/* ---------- boot ---------- */
shell(); wireChrome();
views = $$("[data-view]");
wireForms(); renderPosts();
Dive = makeDive();
window.addEventListener("hashchange", function(){ route(); });
try { if (S.console) S.console.forEach(function(l){ console.log("%c" + l[0], l[1] || ""); }); } catch (e) {}

/* what the network is allowed to touch */
window.Engine = {
  site: S, state: state, toast: toast, hideSpecks: hideSpecks,
  depth: function(){ return depthNow; },
  forceDepth: function(v){ var d = Math.round(Math.max(0, Math.min(1, v)) * 4); if (d === forcedDepth) return; forcedDepth = d; document.body.setAttribute("data-depth", Math.max(depthNow, forcedDepth)); },
  dive: function(){ return Dive; },
  count: function(){ return S.counter ? count : 0; },
  setForeignMotif: function(d){ if (d === foreign) return; foreign = d; shapes = {}; if (Dive) Dive.flush(); },
  setForeignSpeck: function(uri){ extraSpeck = uri; },
  icon: ICON.d
};
route(true);
})();
