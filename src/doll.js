// Window Shop: pixel doll renderer (spec §5). Builds the doll and clothes from
// the parts in data/parts.js on a 64 × 128 grid. The core is pure (no DOM) so it
// can be tested in Node; toDataURL() needs a browser canvas.
(function (root) {
  "use strict";
  const W = 64, H = 128;
  const P = () => root.WS_PARTS;
  const PAL = () => root.WS_PALETTE;
  const PAT = () => root.WS_PATTERNS;

  // ---------- color ----------
  function hexRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbHex(r, g, b) {
    return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  }
  function toHsl(hex) {
    let [r, g, b] = hexRgb(hex).map((v) => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function fromHsl(h, s, l) {
    h = ((h % 360) + 360) % 360; s = clamp(s); l = clamp(l);
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return rgbHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
  }
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const toward = (h, target, amt) => { const d = ((target - h + 540) % 360) - 180; return h + Math.sign(d) * Math.min(Math.abs(d), amt); };
  function mix(a, b, t = 0.5) {
    const x = hexRgb(a), y = hexRgb(b);
    return rgbHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
  }

  // Auto-shading (spec §5.4 step 2.3): shadow, highlight and outline from one color.
  const shadeCache = new Map();
  function shades(hex) {
    if (shadeCache.has(hex)) return shadeCache.get(hex);
    const [h, s, l] = toHsl(hex);
    const dark = l < 0.22;
    const out = {
      main: hex,
      shadow: fromHsl(toward(h, 250, 10), s + 0.04, l - (dark ? 0.06 : 0.13)),
      light: fromHsl(toward(h, 50, 6), s, l + (dark ? 0.16 : 0.1)),
      line: fromHsl(toward(h, 260, 12), s * 0.85 + 0.05, dark ? l * 0.45 : l * 0.42),
    };
    shadeCache.set(hex, out);
    return out;
  }

  function color(name) {
    if (!name) return null;
    if (name[0] === "#") return name;
    const c = PAL().colors[name] || PAL().fixed[name];
    if (!c) throw new Error("Unknown color: " + name);
    return c;
  }

  const packCache = new Map();
  function pack(hex) {
    let v = packCache.get(hex);
    if (v === undefined) {
      const [r, g, b] = hexRgb(hex);
      v = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
      packCache.set(hex, v);
    }
    return v;
  }

  // ---------- masks ----------
  const newMask = () => new Uint8Array(W * H);
  const at = (m, x, y) => x >= 0 && x < W && y >= 0 && y < H && m[y * W + x] === 1;

  function eachRow(p, fn) {
    const pts = p.pts;
    if (pts.length === 1) return fn(pts[0][0], pts[0][1], pts[0][2]);
    for (let k = 0; k < pts.length - 1; k++) {
      const [y0, i0, o0] = pts[k], [y1, i1, o1] = pts[k + 1];
      for (let y = k === 0 ? y0 : y0 + 1; y <= y1; y++) {
        const t = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
        fn(y, i0 + (i1 - i0) * t, o0 + (o1 - o0) * t);
      }
    }
  }

  function stamp(m, profiles, v = 1, opt = {}) {
    for (const p of profiles || []) {
      const side = p.side || "both", dy = opt.dy || 0;
      eachRow(p, (y, inner, outer) => {
        y += dy;
        if (y < 0 || y >= H) return;
        const o = Math.round(outer + (opt.grow || 0) + (p.wave ? p.wave * Math.sin(y * 1.1) : 0));
        for (let d = Math.max(0, Math.round(inner)); d < o && d < 32; d++) {
          if (side !== "right") m[y * W + 31 - d] = v;
          if (side !== "left") m[y * W + 32 + d] = v;
        }
      });
    }
    return m;
  }
  const carve = (m, profiles, opt) => stamp(m, profiles, 0, opt);
  function clip(m, y0, y1) {
    for (let y = 0; y < H; y++) if (y < y0 || y > y1) m.fill(0, y * W, y * W + W);
    return m;
  }
  const isEmpty = (m) => !m.some((v) => v);

  // ---------- painting ----------
  function patternInfo(name) {
    return PAT()[name] || PAT().solid;
  }

  function codeColors(main, accent) {
    const s = shades(main);
    return {
      ".": main, a: accent, m: mix(main, accent), d: s.shadow, h: s.light,
      s: mix(main, s.shadow), l: mix(main, s.light), w: PAL().fixed.white,
      k: s.line, y: PAL().fixed.yellow, g: PAL().fixed.leaf,
    };
  }

  // Fill a mask: outline on its edge, pattern inside, shadow on the right and
  // bottom rims, highlight on the left rim.
  function paint(pix, m, o) {
    const edgeM = o.edgeMask || m;
    const base = o.shades || shades(o.main);
    const pat = patternInfo(o.pattern || "solid");
    const accent = o.accent || color(pat.accent) || base.shadow;
    const codes = codeColors(base.main, accent);
    const tile = o.tile || pat.tile;
    const th = tile.length, tw = tile[0].length;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!m[y * W + x]) continue;
        let hex;
        if (!at(edgeM, x - 1, y) || !at(edgeM, x + 1, y) || !at(edgeM, x, y - 1) || !at(edgeM, x, y + 1)) {
          hex = base.line;
        } else {
          const code = tile[y % th][x % tw];
          hex = codes[code] || base.main;
          const isMain = hex === base.main;
          if (!at(edgeM, x + 2, y) || !at(edgeM, x, y + 2)) hex = isMain ? base.shadow : shades(hex).shadow;
          else if (!at(edgeM, x - 2, y)) hex = isMain ? base.light : shades(hex).light;
        }
        pix[y * W + x] = pack(hex);
      }
    }
  }

  // Paint a flat color on mask pixels that are inside `within` (not its edge).
  function paintInside(pix, m, within, hex) {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (m[y * W + x] && at(within, x, y) && at(within, x - 1, y) && at(within, x + 1, y) && at(within, x, y - 1) && at(within, x, y + 1))
          pix[y * W + x] = pack(hex);
  }

  function line(pix, x0, y0, x1, y1, hex, within, dotted) {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, i = 0;
    for (;;) {
      if ((!within || at(within, x0, y0)) && (!dotted || i % 2 === 0) && x0 >= 0 && x0 < W && y0 >= 0 && y0 < H) pix[y0 * W + x0] = pack(hex);
      i++;
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  function sprite(pix, spr, codes, opt = {}) {
    const x0 = opt.x !== undefined ? opt.x : spr.x, y0 = opt.y !== undefined ? opt.y : spr.y;
    const draw = (flip) => {
      spr.rows.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) {
          const code = row[c];
          if (code === ".") continue;
          let hex = typeof codes === "function" ? codes(code, x0 + c, y0 + r) : codes[code];
          if (!hex) continue;
          const x = flip ? W - 1 - (x0 + c) : x0 + c, y = y0 + r;
          if (x >= 0 && x < W && y >= 0 && y < H) pix[y * W + x] = pack(hex);
        }
      });
    };
    draw(false);
    if (spr.mirror || opt.mirror) draw(true);
  }

  // Sprite colors for shoes/bags/accessories, recolored from the item (spec §5.4).
  function itemCodes(item, defAccent) {
    const main = color(item.color), s = shades(main);
    const acc = color(item.accentColor) || color(defAccent) || s.shadow;
    const as = shades(acc), F = PAL().fixed;
    const pat = patternInfo(item.pattern || "solid");
    const pc = codeColors(main, color(item.accentColor) || color(pat.accent) || s.shadow);
    return (code, x, y) => {
      switch (code) {
        case "m": {
          const t = pat.tile, ch = t[y % t.length][x % t[0].length];
          return pc[ch] || main;
        }
        case "o": return s.line;
        case "h": return s.light;
        case "d": return s.shadow;
        case "a": return acc;
        case "A": return as.shadow;
        case "w": return F.white;
        case "k": return F.black;
        case "g": return F.gold;
        case "G": return F.goldDark;
        case "s": return F.silver;
      }
    };
  }

  // ---------- garments (spec §5.4) ----------
  const SLOT = { top: "top", dress: "onepiece", skirt: "bottom", pants: "bottom", shorts: "bottom", jacket: "outer", shoes: "shoes", bag: "bag", accessory: "accessory" };
  const slotOf = (item) => item.slot || SLOT[item.category];

  function buildGarment(item) {
    const parts = P(), cat = item.category, fit = item.fit || "regular";
    const body = newMask(), arms = newMask();
    const hem = parts.hems[item.length || { top: "waist", dress: "knee", jacket: "hip", skirt: "mini", shorts: "mini", pants: "maxi" }[cat]];
    const extra = { folds: [], collar: null, lapels: false, waistband: false, pockets: false };

    if (cat === "top" || cat === "dress" || cat === "jacket") {
      const grow = cat === "jacket" ? 1 : 0;
      stamp(body, parts.torso[fit], 1, { grow });
      if (cat === "dress") {
        clip(body, 0, 73);
        stamp(body, parts.skirt[fit].parts);
        extra.folds = parts.skirt[fit].folds;
      } else if (cat === "jacket" && hem > 80) {
        stamp(body, parts.skirt.regular.parts, 1, { grow: 1 });
        extra.folds = parts.skirt.regular.folds;
      }
      clip(body, 0, hem);
      const nk = parts.neckline[item.neckline || "crew"];
      carve(body, nk.carve);
      stamp(body, nk.add);
      const sl = parts.sleeves[item.sleeves || (cat === "jacket" ? "long" : "short")];
      carve(body, sl.carve);
      stamp(body, sl.add);
      stamp(arms, sl.arm, 1, { grow: fit === "oversized" || cat === "jacket" ? 1 : 0 });
      if (nk.armsTop) clip(arms, nk.armsTop, H - 1);
      stamp(arms, nk.armsAdd);
      if (nk.collar) extra.collar = nk.collar;
      if (cat === "jacket") {
        const closed = item.detail === "zipper" || item.detail === "buttons";
        if (!closed) carve(body, item.neckline === "V" ? parts.jacket.openingV : parts.jacket.opening);
        if (item.neckline === "collar") { extra.collar = null; extra.lapels = !closed; }
      }
    } else if (cat === "skirt") {
      stamp(body, parts.skirt[fit].parts);
      clip(body, 0, hem);
      extra.folds = parts.skirt[fit].folds;
      extra.waistband = true;
    } else if (cat === "pants" || cat === "shorts") {
      stamp(body, parts.pants.hip);
      stamp(body, parts.pants.leg[item.leg || "straight"]);
      clip(body, 0, hem);
      extra.waistband = true;
      extra.pockets = item.leg === "cargo";
    }

    // Mask-changing details.
    if (item.detail === "slit" && hem >= 98) carve(body, parts.details.slit, { dy: hem });
    if (item.detail === "cut-out") carve(body, parts.details.cutOut);
    if (item.detail === "ruffle") {
      for (let x = 0; x < W; x++) {
        let bottom = -1;
        for (let y = H - 1; y >= 0; y--) if (body[y * W + x]) { bottom = y; break; }
        if (bottom >= hem - 1 && x % 3 !== 2 && bottom + 1 < H) body[(bottom + 1) * W + x] = 1;
      }
    }
    return { body, arms, hem, extra };
  }

  function drawGarmentBody(pix, item, g) {
    if (isEmpty(g.body)) return;
    const main = color(item.color), s = shades(main);
    const accent = color(item.accentColor);
    paint(pix, g.body, { main, accent, pattern: item.pattern });
    const parts = P(), F = PAL().fixed;

    for (const [[y0, d0], [y1, d1]] of g.extra.folds) {
      const m = newMask();
      stamp(m, [{ pts: [[y0, d0, d0 + 1], [y1, d1, d1 + 1]] }]);
      paintInside(pix, m, g.body, s.shadow);
    }
    if (g.extra.waistband) paintInside(pix, clip(stamp(newMask(), [{ pts: [[72, 0, 20]] }]), 72, 72), g.body, s.shadow);
    if (g.extra.pockets) {
      const m = stamp(newMask(), parts.pants.pockets);
      for (let i = 0; i < m.length; i++) m[i] = m[i] && g.body[i];
      paint(pix, m, { main: s.shadow });
    }
    if (g.extra.lapels) {
      const m = stamp(newMask(), parts.jacket.lapels);
      paintInside(pix, m, g.body, s.shadow);
    }
    if (g.extra.collar) {
      const m = stamp(newMask(), g.extra.collar);
      paint(pix, m, { main: accent || F.white });
    }
    if (item.detail === "ruffle") {
      for (let x = 0; x < W; x++) {
        for (let y = g.hem - 3; y <= g.hem - 3; y++) if (at(g.body, x, y) && at(g.body, x, y + 4)) pix[y * W + x] = pack(s.shadow);
      }
    }

    // Overlay details.
    const top = firstRow(g.body, 31);
    const acc = accent || (toHsl(main)[2] > 0.6 ? s.line : s.light);
    if (item.detail === "belt") {
      const [r0, r1] = parts.details.beltRows;
      const m = clip(Uint8Array.from(g.body), r0, r1);
      paint(pix, m, { main: accent || "#4a2f25" });
      sprite(pix, parts.details.buckle, { g: F.gold, k: accent || "#4a2f25" });
    }
    if (item.detail === "buttons") {
      for (let y = top + 2; y < g.hem - 1; y += 4) if (at(g.body, 31, y)) pix[y * W + 31] = pack(acc);
    }
    if (item.detail === "zipper") {
      for (let y = top + 1; y < g.hem; y++) if (at(g.body, 31, y)) pix[y * W + 31] = pack(F.silver);
      if (at(g.body, 32, top + 2)) pix[(top + 2) * W + 32] = pack(F.silver);
    }
    if (item.detail === "lace-up") {
      sprite(pix, parts.details.laceUp, { a: acc }, { y: top + 1 });
    }
    if (item.detail === "bow") {
      const b = shades(accent || s.light);
      sprite(pix, parts.details.bow, { o: b.line, a: b.main, A: b.shadow }, { x: 28, y: Math.max(top, 50) });
    }
    if (item.graphic) {
      const gr = parts.graphics[item.graphic];
      const gx = 32 - Math.floor(gr[0].length / 2);
      sprite(pix, { rows: gr }, { a: accent || color("hot-pink"), g: F.leaf }, { x: gx, y: top + 4 });
    }
  }

  function firstRow(m, x) {
    for (let y = 0; y < H; y++) if (m[y * W + x]) return y;
    return 0;
  }

  // ---------- sprite items ----------
  function drawShoes(pix, item) {
    const def = P().shoes[item.style];
    if (!def) throw new Error("Unknown shoe style: " + item.style);
    if (def.shaft) {
      const m = stamp(newMask(), def.shaft);
      paint(pix, m, { main: color(item.color), pattern: item.pattern });
    }
    sprite(pix, def, itemCodes(item, def.accent), { mirror: true });
  }

  function drawBag(pix, item) {
    const def = P().bags[item.style];
    if (!def) throw new Error("Unknown bag style: " + item.style);
    const codes = itemCodes(item, "gold");
    const strap = def.strapColor === "gold" ? PAL().fixed.gold : codes("o");
    for (const [x0, y0, x1, y1] of def.straps) line(pix, x0, y0, x1, y1, strap, null, def.dotted);
    sprite(pix, def, codes);
  }

  function drawAccessory(pix, item) {
    const def = P().accessories[item.style];
    if (!def) throw new Error("Unknown accessory style: " + item.style);
    if (def.band) {
      paint(pix, stamp(newMask(), def.band), { main: color(item.color), pattern: item.pattern });
      return;
    }
    const codes = itemCodes(item);
    sprite(pix, def, (c, x, y) => (c === "w" ? PAL().fixed.white : c === "g" ? PAL().fixed.gold : codes(c, x, y)));
  }

  // ---------- the doll ----------
  function face(pix, look) {
    const parts = P().face, pal = PAL(), F = pal.face;
    const skin = pal.skins[look.skin] || pal.skins.medium;
    const iris = (pal.eyeColors[look.eyes] || pal.eyeColors.brown).main;
    const hair = shades((pal.hairColors[look.hairColor] || pal.hairColors.espresso).main);
    const lip = shades(skin.lips);
    sprite(pix, parts.eye, { e: mix(skin.main, F.eyeshadow, 0.55), k: F.liner, w: F.eyeWhite, i: iris, I: shades(iris).shadow, p: F.liner, h: "#ffffff" });
    sprite(pix, parts.brow, { b: toHsl(hair.main)[2] > 0.6 ? hair.line : hair.shadow });
    sprite(pix, parts.nose, { n: skin.shadow });
    sprite(pix, parts.lips, { L: skin.lips, D: lip.line, G: F.gloss });
    sprite(pix, parts.blush, { r: mix(skin.main, F.blush, 0.45) });
  }

  // look: { skin, hair, hairColor, eyes }. items: equipped items (any order).
  function render(look, items, opt = {}) {
    const pix = new Uint32Array(W * H);
    const parts = P(), pal = PAL();
    const skin = pal.skins[look.skin] || pal.skins.medium;
    const style = parts.hair[look.hair] || parts.hair.long;
    const hairHex = (pal.hairColors[look.hairColor] || pal.hairColors.espresso).main;
    const bySlot = {};
    for (const it of items || []) {
      const s = slotOf(it);
      if (s === "accessory") (bySlot.accessory = bySlot.accessory || []).push(it);
      else bySlot[s] = it;
    }
    const built = {};
    for (const s of ["bottom", "top", "onepiece", "outer"]) if (bySlot[s]) built[s] = buildGarment(bySlot[s]);
    const doll = !opt.itemOnly;

    if (doll) {
      paint(pix, stamp(newMask(), style.back), { main: hairHex, pattern: style.tile });
      const trunk = stamp(newMask(), parts.body.trunk);
      paint(pix, trunk, { shades: skin });
      paint(pix, stamp(newMask(), parts.body.underwear), { main: pal.fixed.underwear });
      paintInside(pix, stamp(newMask(), [parts.body.neckShadow]), trunk, skin.shadow);
      paint(pix, stamp(newMask(), [parts.body.head]), { shades: skin });
      face(pix, look);
    }
    if (bySlot.shoes) drawShoes(pix, bySlot.shoes);
    for (const s of ["bottom", "top", "onepiece"]) if (built[s]) drawGarmentBody(pix, bySlot[s], built[s]);
    if (doll) {
      const arms = stamp(newMask(), parts.body.arms);
      const union = stamp(stamp(newMask(), parts.body.trunk), parts.body.arms);
      paint(pix, arms, { shades: skin, edgeMask: union });
    }
    for (const s of ["top", "onepiece"]) if (built[s] && !isEmpty(built[s].arms)) paint(pix, built[s].arms, { main: color(bySlot[s].color), accent: color(bySlot[s].accentColor), pattern: bySlot[s].pattern });
    if (built.outer) {
      drawGarmentBody(pix, bySlot.outer, built.outer);
      const o = bySlot.outer;
      if (!isEmpty(built.outer.arms)) paint(pix, built.outer.arms, { main: color(o.color), accent: color(o.accentColor), pattern: o.pattern });
    }
    if (bySlot.bag) drawBag(pix, bySlot.bag);
    const accs = bySlot.accessory || [];
    for (const a of accs) if (!parts.accessories[a.style].top) drawAccessory(pix, a);
    if (doll) {
      const hm = newMask();
      stamp(hm, style.front);
      paint(pix, hm, { main: hairHex, pattern: style.tile });
      const hs = shades(hairHex);
      for (const ex of style.extras || []) paint(pix, stamp(newMask(), [ex]), { main: ex.color ? color(ex.color) : hairHex, pattern: ex.color ? "solid" : style.tile });
      if (style.shine) paintInside(pix, stamp(newMask(), style.shine), hm, hs.light);
      if (style.part) paintInside(pix, stamp(newMask(), style.part), hm, hs.line);
    }
    for (const a of accs) if (parts.accessories[a.style].top) drawAccessory(pix, a);
    return pix;
  }

  // Bounding box of drawn pixels.
  function bbox(pix) {
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (pix[y * W + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  // ---------- browser output ----------
  function toCanvas(pix, scale, crop) {
    const box = crop || { x: 0, y: 0, w: W, h: H };
    const src = document.createElement("canvas");
    src.width = W; src.height = H;
    const ctx = src.getContext("2d");
    const img = ctx.createImageData(W, H);
    new Uint32Array(img.data.buffer).set(pix);
    ctx.putImageData(img, 0, 0);
    const out = document.createElement("canvas");
    out.width = box.w * scale; out.height = box.h * scale;
    const o = out.getContext("2d");
    o.imageSmoothingEnabled = false; // keep pixel edges sharp (spec §8)
    o.drawImage(src, box.x, box.y, box.w, box.h, 0, 0, out.width, out.height);
    return out;
  }

  const urlCache = new Map();
  function dollURL(look, items, scale) {
    const key = JSON.stringify([look, (items || []).map((i) => i.id).sort(), scale]);
    if (!urlCache.has(key)) urlCache.set(key, toCanvas(render(look, items), scale).toDataURL());
    return urlCache.get(key);
  }
  function itemURL(item, maxPx = 120) {
    const key = "item:" + item.id + ":" + maxPx;
    if (!urlCache.has(key)) {
      const pix = render({}, [item], { itemOnly: true });
      const box = bbox(pix);
      const scale = Math.max(2, Math.floor(Math.min(maxPx / box.w, maxPx / box.h)));
      urlCache.set(key, toCanvas(pix, scale, box).toDataURL());
    }
    return urlCache.get(key);
  }

  const api = { W, H, render, bbox, slotOf, buildGarment, shades, dollURL, itemURL };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Doll = api;
})(typeof window !== "undefined" ? window : globalThis);
