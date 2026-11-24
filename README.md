# The Chamber

The Meridian Chamber of Commerce: a directory of fifty fictional businesses, each slick on the surface and obsessed with one thing underneath. Every member can bleed into the others.

Live at https://linglab.org/chamber/

## What's here

| Path | What it is |
|---|---|
| `index.html` | The front door: the member directory, and the Members' console (a patch bay for every member open in your browser) |
| `directory.json` | All 50 members, their slots, and which ones are open |
| `engine/` | The shared engine every member runs on: `engine.css`, `engine.js` (router, depth, rooms, ASCII, hidden specks, the endless dive), `bridge.js` (the network), `invisible-hands.js` (protocol 1), and shared stock photos |
| `kestrel/` | Kestrel Capital, member No. 02: venture capital that incubates. Literally. |

MouthBreeder (Corpora Meridian, No. 01) lives in its own repo and joins the network by loading `engine/bridge.js` and publishing its own `atoms.json`.

## Making a member

A member is a folder with three files:

- `index.html`: the site's own tokens and a few styles, then `site.js`, `../engine/oddities.js`, `../engine/backdoor.js`, `../engine/engine.js`, `../engine/invisible-hands.js` and `../engine/bridge.js`.
- `site.js`: `window.SITE`, which holds everything else: pages, posts, rooms, the motif (`motif.polys(n, rng, weirdness)` returns polygons for level `n` of the dive), the trapped character, chat, cookie banner and forms.
- `atoms.json`: what siblings may borrow. Generate it with `node tools/atoms.mjs <folder>`.

Then mark it `"live": true` in `directory.json`.

## When it goes wrong

`engine/oddities.js` makes every member go wrong in its own voice, built only from its own material: its word, its hidden word, its trapped character's lines, its rooms, counter and photographs. Deeper pages go wrong more often.

- **Glitches** (a few seconds, then the page puts itself back): possess, tear, mirror, melt, swarm, stare, breathe, dark, redact, stutter, count, menu, trail, confess.
- **Episodes**: three to five glitches in a row, then the page splits and a link through the split leads into a rabbit hole.
- **Rabbit holes** (`#hole-…`): `corridor` (a crawl through the basement levels, with a map that is a little wrong and things to carry), `staff` (a directory, page n of ∞, whose chain of command reaches the trapped character, who reports to you), `terms` (supplementary terms; every footnote is smaller, down to schedule X), `archive` (the site in 2011, 1999, 1987, 1952, 1897 and before), `basement` (the homepage again, one floor lower and worse each time).
- **Doors**: footer fine print (staff login, site history), the legal page, the 404 page, and now and then a room's exits.

- **The back door** (`engine/backdoor.js`): press `` ` `` anywhere, or find the blinking `_` in the footer, a service hatch in a room, or a connection that slides in from the corner. It is a shell into the site (`ls`, `cat`, `cd /vault`, `sudo`, `finger`, `ps`, `talk`), and `ssh <member>` walks into a sibling's terminal. The sudo password is the site's hidden word.
- **Asks**: a few pages in, a site sometimes asks in its own voice for the camera, microphone or location. If you say no, it doesn't ask again that session. If you say yes and the browser agrees, the camera redraws your face out of the site's motif, the microphone plays you back slowed and reversed under a dark echo, and location turns into a radar of made-up, oddly specific lines. All of this runs in the tab and stops when the overlay closes: nothing is recorded, stored, sent, or shared over the network, and remote controls can't trigger an ask.

Try one by hand: `?odd=tear` (any glitch name), `?odd=episode`, `?odd=rift`, `?odd=hatch`, `?odd=camera`, `?odd=mic`, `?odd=gps`, `#hole-corridor-1-1` or `#hole-terminal`.

## The network

Only numbers from 0 to 1 travel. Each member exposes `source`, `bleed`, `motif`, `rot`, `palette`, `depth`, `pulse`, `visitor`, `weird` and `glitch`, and reports `depth`, `dwell`, `dive`, `flinch` and `count`. The numbers pick which sibling's `atoms.json` to borrow from and how much of the page to hand over.

- **Alone:** members open in tabs of the same browser find each other over a BroadcastChannel and drive each other with slow LFOs.
- **The console:** the front door's patch bay sends to any member open in the same browser, with its own LFO.
- **A room:** members join rooms over the internet through the Invisible Hands relay at `wss://invisible-hands.samuelling.workers.dev` (start one from any Network panel, or open a member with `?room=<code>`).

Every member has a Network switch (footer link, or the chip that appears when something is leaning on the page) that stops remote control and puts the page back.

## This is satire

Every business here is fictional. Nothing is a real offer, the forms send nothing, and nobody is in residence. Shared stock photos in engine/img are from Unsplash under the Unsplash License. Each member's own photos (300 in all) are from Wikimedia Commons under CC0, public domain, CC BY or CC BY-SA; every one is credited by author and licence on that member's Legal page and in its credits.json. Photos were chosen to avoid identifiable people.

## Home page layouts

Members' front pages come in six families, each modelled on a kind of real corporate site, so the Chamber doesn't read as fifty copies of one template:

| Family | After | Members |
|---|---|---|
| Poster (`hero layout: "poster"` + `tiles` + `band`) | Tesla, Apple, Rolex | Northwind, Atlas, Gilded, Lacquer, Halden, Seatwell, Silicate, Ascend, Driftwood, Lumen, Stride |
| Mosaic (`"mosaic"` + `mosaic`) | Airbnb, Patagonia, Aesop, Warby Parker | Bloomfield, Harbor, Thimble, Gristmill, Kinfolk, Orchard, Hollow, Tenfold, Clearview, Aster |
| Type (`"type"` + `marquee` + `statement`) | Nike, Pentagram, Stripe | Verity, Quillon, Lark, Tessellate, Cling, Brightside, Ironbark, Cradle, Vessel |
| Dashboard (`ticker` + `"dash"`) | Bloomberg, Palantir, Datadog | Polaris, Cumulus, Copperline, Sable, Lodestar, Cobalt, Cuffwell, Northgate, Tally |
| Index (`index` + `band`) | Monocle, McKinsey, GOV.UK | Wren, Fernhill, Whitmore, Ember, Under, Brightwater |
| Classic SaaS | every B2B startup | Ossian, Saltmarsh, Driftwell |

Headers vary too (`header: "overlay" | "center" | "minimal"`). `node tools/rehome.js <slug>` rebuilds a home page from its family config; run it on the spec as committed before the rehome, not twice.

## Driving the Chamber from mega-cv (Invisible Hands)

Every member site, the front door and MouthBreeder speak Invisible Hands protocol 1 (see samuelling/InvisibleHands, SPEC.md) through the relay at `wss://invisible-hands.samuelling.workers.dev`.

**Getting sites into a room.** Open any member with `?room=<code>` (e.g. `…/Chamber/vessel/?room=moss-kiln-opal-fern-42`), or use the Network chip → Rooms → Start. Once a tab is in a room it stays in it as you move from member to member; members opened from the front door join its room too.

**What each site exposes** (app slug `chamber-<slug>`, name = the company name). All values 0–1:

| Control | Kind | What it does |
|---|---|---|
| `source` | cont | Which member bleeds in: the 50 members in directory order, (index + 0.5) / 50 (a site never picks itself; it takes the nearest neighbour) |
| `bleed` | cont | How much of the source leaks in: words from 0, whole sentences from 0.2, photographs from 0.35 |
| `motif` | toggle-ish | Above 0.5, the source's motif replaces this site's shapes in the dive and the hidden specks |
| `rot` | cont | Words all over the page quietly turn into the source's words (up to ~40, rising with the square) |
| `palette` | cont | Washes the page in the source's colours |
| `depth` | cont | Forces the page toward its dark levels (0 = surface, 1 = deepest) |
| `pulse` | trig | Each rising edge flashes a source photograph and line across the page for a split second |
| `visitor` | toggle | The source's trapped character starts whispering lines into the page |
| `weird` | cont | How often the page goes wrong on its own: 0 leaves it to depth and chance, 1 means a glitch on most pages and frequent episodes |
| `glitch` | trig | Each rising edge fires one glitch now, cutting off any glitch already running |

Outputs, published as `state`: `depth` (how deep the reader is), `dwell` (time on the page, 2 min = 1), `dive` (scroll speed in the dive), `flinch` (scrolling back up in a hurry), `count` (the live counter).

**Sending.** All members share the same control ids, so one message with no `to` moves every open site at once; `to: "app:chamber-vessel"` moves only Vessel. Use `mod`/`set` at 20–30 Hz for LFOs and a `ramp` for envelopes. Each connection may send about 120 messages a second, so broadcast where you can rather than looping over sites.

**Limits worth knowing.** 16 connections per room, counting mega-cv, the front door, and every open site tab. Sites go back to their own slow LFOs 20 s after the last remote message, and anyone can switch remote control off from the Network chip.
