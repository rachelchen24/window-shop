// Window Shop: pre-drawn doll and clothing parts (spec §5.2–5.4). Plain data, no code.
//
// The doll lives on a 64 × 128 grid and is symmetric around the line between
// columns 31 and 32. Most parts are PROFILES: a list of [row, inner, outer]
// points. On each row a profile covers the columns whose distance from the
// center line is in [inner, outer), on both sides (or one, with `side`).
// Rows between points are interpolated, so a few points describe a smooth shape.
//
// SPRITES are small pixel drawings ("." = transparent). `mirror: true` also
// draws a flipped copy on the other side of the center line.
// Sprite codes: o outline, m main, h highlight, d shadow, a accent,
// A accent shadow, w white, k black, g gold, G dark gold, s silver.
globalThis.WS_PARTS = {
  // ---------- the doll ----------
  body: {
    head: {
      pts: [
        [5, 0, 6], [6, 0, 9], [8, 0, 12], [10, 0, 14], [13, 0, 15.5], [17, 0, 16.5], [21, 0, 17],
        [31, 0, 17], [34, 0, 16], [37, 0, 14.5], [40, 0, 12], [43, 0, 8.5], [45, 0, 6], [46, 0, 4], [47, 0, 2],
      ],
    },
    trunk: [
      { pts: [[42, 0, 3], [51, 0, 3]] }, // neck
      { pts: [[51, 0, 4], [52, 0, 8], [53, 0, 10], [55, 0, 10], [60, 0, 9], [66, 0, 7], [70, 0, 7], [74, 0, 9], [82, 0, 9]] },
      { pts: [[83, 1, 9], [86, 1, 8], [96, 2, 7], [100, 2, 7], [108, 2, 6], [116, 3, 6], [118, 3, 6]] }, // legs
      { pts: [[118, 2.5, 6.5], [119, 2, 7], [122, 2, 7], [123, 2.5, 6.5]] }, // bare feet
    ],
    arms: [
      { pts: [[53, 9, 13], [57, 10, 14], [66, 11, 15], [76, 12, 16], [80, 12, 16]] },
      { pts: [[80, 12, 16], [81, 12, 17], [86, 12, 17], [87, 13, 16]] }, // hands
    ],
    neckShadow: { pts: [[46, 0, 3], [48, 0, 3]] },
    underwear: [
      { pts: [[56, 0, 9.5], [59, 0, 9.3]] },
      { pts: [[71, 0, 7.5], [74, 0, 9.5], [81, 0, 9.5], [82, 0, 6], [84, 0, 2]] },
    ],
  },

  // Face features. Codes: e eyeshadow, k liner/lashes, w eye white, i iris,
  // I dark iris, p pupil, h highlight, b brow, L lips, D lip line, G gloss,
  // n nose shadow, r blush.
  face: {
    eye: {
      x: 16, y: 20, mirror: true,
      rows: [
        "..k.eeeee...",
        "k.keeeeeeee.",
        ".kkkkkkkkkk.",
        "..kwiiiiiwkk",
        "..kwihpiiwwk",
        "...kiippiwwk",
        "...kIiiiIwk.",
        "....kkkkkk..",
      ],
    },
    brow: { x: 17, y: 16, mirror: true, rows: ["...bbbb.", ".bb....b", "b......."] },
    nose: { x: 30, y: 35, mirror: true, rows: ["n."] },
    lips: { x: 28, y: 38, mirror: true, rows: [".LL.", "LLLL", "DDDD", ".LLG", "..LL"] },
    blush: { x: 17, y: 32, mirror: true, rows: ["rrr"] },
  },

  // ---------- hair (chosen at onboarding; not sold) ----------
  // back: drawn behind the body. front: drawn over everything but top accessories.
  hair: {
    long: {
      label: "Long & sleek",
      tile: "hair-straight",
      back: [{ pts: [[3, 0, 12], [5, 0, 16], [9, 0, 19.5], [16, 0, 21], [30, 0, 21.5], [50, 0, 21], [70, 0, 20], [86, 0, 18], [92, 0, 15], [95, 0, 11]] }],
      front: [{
        pts: [
          [1, 0, 7], [2, 0, 10], [3, 0, 12.5], [5, 0, 15], [8, 0, 17.5], [12, 0, 19], [13, 1, 19.5], [15, 5, 20], [17, 9, 20.5],
          [19, 12.5, 20.5], [22, 16, 21], [34, 16, 21], [42, 15, 21], [52, 15, 20], [60, 15, 19], [64, 16, 18],
        ],
      }],
      shine: [{ pts: [[6, 5, 12], [7, 4, 13], [8, 5, 12.5]] }],
      part: [{ pts: [[2, 0, 1], [12, 0, 1]] }],
    },
    curls: {
      label: "Big curls",
      tile: "hair-curly",
      back: [{ wave: 1, pts: [[2, 0, 12], [4, 0, 17], [8, 0, 21], [14, 0, 23.5], [24, 0, 25], [40, 0, 25], [52, 0, 24], [62, 0, 21], [68, 0, 17], [71, 0, 12]] }],
      front: [
        { side: "left", wave: 1, pts: [[0, 0, 8], [1, 0, 11], [3, 0, 15], [6, 0, 18.5], [10, 0, 21], [14, 0, 22], [16, 0, 22], [19, 8, 22.5], [21, 13, 23], [24, 16, 23.5], [44, 15.5, 24], [54, 15, 23], [62, 15, 21], [66, 16, 19]] },
        { side: "right", wave: 1, pts: [[0, 0, 8], [1, 0, 11], [3, 0, 15], [6, 0, 18.5], [10, 0, 21], [13, 0, 22], [14, 4, 22], [16, 10, 22.5], [19, 14, 23], [24, 16, 23.5], [44, 15.5, 24], [54, 15, 23], [62, 15, 21], [66, 16, 19]] },
      ],
      shine: [{ pts: [[6, 4, 12], [8, 3, 13], [9, 4, 12]] }],
    },
    pony: {
      label: "High ponytail",
      tile: "hair-straight",
      back: [
        { pts: [[4, 0, 13], [8, 0, 17], [12, 0, 18.5], [30, 0, 18.5], [38, 0, 16], [42, 0, 12]] },
        { side: "right", pts: [[3, 6, 12], [8, 11, 19], [14, 14, 22], [24, 15, 23], [40, 15, 22], [56, 14, 20], [66, 13, 17], [70, 14, 15]] },
      ],
      front: [{
        pts: [[3, 0, 8], [4, 0, 11], [6, 0, 14], [9, 0, 16.5], [12, 0, 18], [14, 0, 18.5], [15, 3, 18.5], [16, 7, 18.5], [18, 12, 18.5], [21, 15, 18.5], [30, 16.5, 18.5], [34, 15.5, 17.5]],
      }],
      extras: [
        { pts: [[0, 0, 3], [1, 0, 4.5], [3, 0, 4.5]] },
        { color: "hot-pink", pts: [[4, 0, 4], [5, 0, 4]] },
      ],
      shine: [{ pts: [[7, 3, 11], [8, 2, 12]] }],
    },
    bob: {
      label: "Blunt bob",
      tile: "hair-straight",
      back: [{ pts: [[3, 0, 12], [5, 0, 16], [9, 0, 19.5], [16, 0, 21.5], [30, 0, 22], [44, 0, 22], [49, 0, 21], [51, 0, 18]] }],
      front: [{
        pts: [[1, 0, 7], [2, 0, 10], [3, 0, 12.5], [5, 0, 15], [8, 0, 17.5], [12, 0, 19.5], [16, 0, 21], [17, 0, 21], [18, 12, 21.5], [19, 14.5, 21.5], [22, 16, 22], [44, 15, 22], [49, 14, 22], [51, 14, 21]],
      }],
      shine: [{ pts: [[6, 4, 12], [7, 3, 13]] }],
    },
    buns: {
      label: "Space buns",
      tile: "hair-curly",
      back: [{ pts: [[4, 0, 13], [8, 0, 17], [12, 0, 19], [24, 0, 19.5], [40, 0, 19], [56, 0, 17], [64, 0, 15], [68, 0, 12]] }],
      front: [{
        pts: [[3, 0, 8], [4, 0, 11], [6, 0, 14], [9, 0, 16.5], [12, 0, 18.5], [14, 0, 19], [15, 3, 19], [17, 8, 19], [19, 12, 19.5], [22, 16, 19.5], [40, 16, 19.5], [50, 16, 19], [56, 16.5, 18.5]],
      }],
      extras: [{ pts: [[0, 9, 15], [1, 8, 16], [2, 7.5, 16.5], [6, 7.5, 16.5], [7, 8, 16], [8, 9, 15]] }],
      shine: [{ pts: [[7, 3, 11], [8, 2, 12]] }],
    },
  },

  // ---------- clothing parts ----------
  // Hem row for each length.
  hems: { crop: 62, waist: 71, hip: 78, mini: 88, knee: 98, midi: 108, maxi: 118 },

  torso: {
    fitted: [{ pts: [[51, 0, 5], [52, 0, 8], [53, 0, 11], [55, 0, 11], [60, 0, 10], [66, 0, 8], [70, 0, 8], [74, 0, 10], [80, 0, 10]] }],
    regular: [{ pts: [[51, 0, 5], [52, 0, 9], [53, 0, 11], [56, 0, 11], [62, 0, 10], [70, 0, 10], [80, 0, 11]] }],
    oversized: [{ pts: [[51, 0, 6], [52, 0, 10], [53, 0, 12], [58, 0, 12.5], [80, 0, 13]] }],
  },

  // Each neckline carves the top edge, and may add pieces.
  neckline: {
    crew: { carve: [{ pts: [[48, 0, 3.5], [51, 0, 3.5], [52, 0, 2.5]] }] },
    V: { carve: [{ pts: [[48, 0, 5], [51, 0, 5], [58, 0, 1]] }] },
    scoop: { carve: [{ pts: [[48, 0, 6], [54, 0, 6], [56, 0, 4.5], [57, 0, 2.5]] }] },
    square: { carve: [{ pts: [[48, 0, 6], [55, 0, 6]] }] },
    halter: {
      carve: [{ pts: [[48, 3, 20], [54, 6, 20], [57, 9, 20]] }],
      add: [{ pts: [[46, 1, 3], [50, 1, 3]] }],
    },
    strapless: { carve: [{ pts: [[46, 0, 20], [56, 0, 20]] }] },
    "off-shoulder": {
      carve: [{ pts: [[46, 0, 20], [54, 0, 20]] }],
      armsTop: 55,
      armsAdd: [{ pts: [[55, 9, 14.5], [58, 10, 15]] }],
    },
    collar: {
      carve: [{ pts: [[48, 0, 3.5], [51, 0, 3.5], [52, 0, 2.5]] }],
      collar: [{ pts: [[50, 1, 5.5], [52, 1, 6], [53, 2, 5], [54, 3, 4]] }],
    },
  },

  // arm: the sleeve itself. carve/add: shaping of the shoulders on the body.
  sleeves: {
    none: { carve: [{ pts: [[48, 7, 16], [54, 8.5, 16], [57, 9.5, 16]] }] },
    strap: {
      carve: [{ pts: [[48, 4, 16], [55, 6, 16], [56, 8, 16], [58, 9.5, 16]] }],
      add: [{ pts: [[50, 5, 6.5], [57, 7, 8.5]] }],
    },
    cap: { arm: [{ pts: [[52, 8, 14], [57, 9.5, 14.5]] }] },
    short: { arm: [{ pts: [[52, 8, 14], [57, 9.5, 15], [61, 10, 15]] }] },
    elbow: { arm: [{ pts: [[52, 8, 14], [57, 9.5, 15], [66, 10.5, 16]] }] },
    long: { arm: [{ pts: [[52, 8, 14], [57, 9.5, 15], [66, 10.5, 16], [80, 11.5, 17]] }] },
    puff: { arm: [{ pts: [[52, 8, 14], [54, 8, 16], [59, 9, 16.5], [61, 10, 15.5], [62, 10, 15]] }] },
  },

  // Skirts start at the waist; `folds` are shadow lines [[row, d], [row, d]].
  skirt: {
    fitted: { parts: [{ pts: [[69, 0, 8], [74, 0, 10], [82, 0, 10], [100, 0, 9.5], [118, 0, 9]] }], folds: [] },
    regular: {
      parts: [{ pts: [[69, 0, 8], [74, 0, 10], [80, 0, 11], [90, 0, 13], [100, 0, 15], [110, 0, 17], [118, 0, 19]] }],
      folds: [[[79, 3], [118, 7]], [[81, 7], [118, 14]]],
    },
    oversized: {
      parts: [{ pts: [[69, 0, 8], [74, 0, 11], [80, 0, 13.5], [90, 0, 17], [100, 0, 20], [110, 0, 22], [118, 0, 24]] }],
      folds: [[[78, 2], [118, 6]], [[79, 6], [118, 13]], [[81, 10], [118, 20]]],
    },
  },

  pants: {
    hip: [{ pts: [[69, 0, 8], [74, 0, 10], [83, 0, 10]] }],
    leg: {
      skinny: [{ pts: [[83, 0.5, 10], [86, 1, 9], [96, 1.5, 8], [108, 1.5, 7], [118, 2, 7]] }],
      straight: [{ pts: [[83, 0.5, 10], [118, 0.5, 9]] }],
      wide: [{ pts: [[83, 0.5, 10], [100, 0.5, 12], [118, 0.5, 14]] }],
      flare: [{ pts: [[83, 0.5, 10], [96, 1.5, 8.5], [104, 1.5, 9], [112, 1, 12], [118, 0.5, 14]] }],
      cargo: [{ pts: [[83, 0.5, 11], [118, 0.5, 11]] }],
    },
    pockets: [{ pts: [[90, 4, 9], [96, 4, 9]] }],
  },

  jacket: {
    opening: [{ pts: [[48, 0, 5], [60, 0, 1], [127, 0, 1]] }],
    openingV: [{ pts: [[48, 0, 4], [65, 0, 1], [127, 0, 1]] }],
    lapels: [{ pts: [[51, 1, 6.5], [56, 1, 4.5], [60, 1, 2.5]] }],
  },

  // ---------- details (spec §5.4: max one per item) ----------
  details: {
    beltRows: [69, 71],
    buckle: { x: 30, y: 69, rows: ["gggg", "gkkg", "gggg"] },
    bow: { rows: ["oo...oo", "oaoAoao", "oaaAaao", "oaoAoao", "oo...oo"] },
    laceUp: { x: 30, rows: ["a..a", ".aa.", "a..a", ".aa.", "a..a", ".aa.", "a..a"] },
    cutOut: [{ pts: [[62, 0, 1], [64, 0, 3], [66, 0, 1]] }],
    slit: [{ side: "right", pts: [[-14, 4, 4.5], [0, 3, 6]] }], // rows relative to the hem
  },

  // Made-up graphics for tees (no logos).
  graphics: {
    heart: [".a.a.", "aaaaa", ".aaa.", "..a.."],
    star: ["..a..", ".aaa.", "aaaaa", ".a.a.", "a...a"],
    cherry: ["...gg.", "..g.g.", ".g...g", "aa..aa", "aa..aa"],
    xoxo: ["a.a.aaa.a.a.aaa", ".a..a.a..a..a.a", "a.a.aaa.a.a.aaa"],
  },

  // ---------- whole sprites: shoes, bags, accessories ----------
  // Shoes are drawn on the left foot and mirrored.
  shoes: {
    "platform-heel": {
      x: 23, y: 114,
      rows: [
        ".oooooo.", ".ommmmo.", ".oooooo.", "........", "..oooo..", ".ommmmo.", "ohmmmmdo", "ohmmmmdo",
        "oooooooo", "oaaaaaao", "oaaaaaao", "oaaaaaao", "oAAAAAAo", "oooooooo",
      ],
    },
    "chunky-sneaker": {
      x: 23, y: 111, accent: "white",
      rows: [
        "..oooo..", ".ommmmo.", ".omddmo.", "ommddmmo", "omddddmo", "ohmmmmdo", "ohmmmmdo", "ohmmmmdo",
        "ommmmmdo", "oooooooo", "oaaaaaao", "oaaaaaao", "oAAAAAAo", "oooooooo",
      ],
    },
    "platform-sandal": {
      x: 23, y: 114,
      rows: [
        ".oooooo.", ".ommmmo.", ".oooooo.", "........", "........", ".oooooo.", ".ommmmo.", ".oooooo.",
        "oooooooo", "oaaaaaao", "oaaaaaao", "oaaaaaao", "oAAAAAAo", "oooooooo",
      ],
    },
    "ballet-flat": {
      x: 23, y: 119,
      rows: [".oooooo.", "ommmmmmo", "ohmmmmdo", "ohmmmmdo", "oooooooo", "oAAAAAAo", "oooooooo"],
    },
    "knee-boot": {
      x: 23, y: 116,
      shaft: [{ pts: [[95, 1.5, 8], [104, 1.5, 7.5], [112, 2, 7.5], [117, 2, 7.5]] }],
      rows: [
        "ommmmmmo", "ohmmmmdo", "ohmmmmdo", "ohmmmmdo", "ohmmmmdo", "ommmmmmo", "oooooooo",
        "oAAAAAAo", "oAAAAAAo", "oAAAAAAo", "oAAAAAAo", "oooooooo",
      ],
    },
  },

  // Bags hang on the doll's right side (viewer's left). straps: [x0, y0, x1, y1].
  bags: {
    baguette: {
      x: 8, y: 62, straps: [[11, 62, 19, 52], [18, 62, 22, 52]],
      rows: ["oooooooooooo", "ohmmmmmmmmdo", "ommmmmmmmmdo", "ommmmggmmmdo", "ommmmmmmmmdo", "oddddddddddo", "oooooooooooo"],
    },
    mini: {
      x: 5, y: 74, straps: [[8, 74, 21, 52]],
      rows: ["ooooooooooo", "ohmmmmmmmdo", "ommmmmmmmdo", "ooooooooooo", "ommmmgmmmdo", "ommmmmmmmdo", "odddddddddo", "ooooooooooo"],
    },
    tote: {
      x: 3, y: 76, straps: [[5, 76, 13, 70], [13, 70, 15, 76], [8, 76, 16, 70], [16, 70, 18, 76]],
      rows: [
        "oooooooooooooooo", "ohmmmmmmmmmmmmdo", "ohmmmmmmmmmmmmdo", "ommmmmmmmmmmmmdo", "ommmmmmmmmmmmmdo",
        "ommmmmmmmmmmmmdo", "ommmmmmmmmmmmmdo", "ommmmmmmmmmmmmdo", "ommmmmmmmmmmmmdo", "ommmmmmmmmmmmmdo",
        "ommmmmmmmmmmmmdo", "ommmmmmmmmmmmmdo", "ommmmmmmmmmmmmdo", "oddddddddddddddo", "oooooooooooooooo",
      ],
    },
    "chain-bag": {
      x: 5, y: 72, straps: [[7, 72, 21, 52], [15, 72, 23, 52]], strapColor: "gold", dotted: true,
      rows: ["ooooooooooo", "ohmdmmmdmdo", "omdmdmdmddo", "odmmmdmmmdo", "omdmggmdmdo", "odmdmdmdmdo", "omddmmmddmo", "ooooooooooo"],
    },
  },

  // kind decides which accessories can be worn together (one per kind).
  accessories: {
    hoops: { kind: "ears", top: true, x: 12, y: 36, mirror: true, rows: [".oo.", "o..o", "o..h", "o..o", "o..o", ".oo."] },
    sunnies: {
      kind: "head", top: true, x: 13, y: 6, mirror: true,
      rows: ["....kkkkkkkk......", "kkkkkmmmmmmmmk.kkk", "...kmhmmmmmmmk....", "....kmmmmmmmk.....", ".....kkkkkkk......"],
    },
    headband: { kind: "head", top: true, band: [{ pts: [[8, 0, 17.5], [10, 0, 19]] }] },
    clips: { kind: "head", top: true, x: 18, y: 10, mirror: true, rows: ["m.m..", "mmm..", ".h...", "mmm..", "m.m.."] },
    pearls: { kind: "neck", x: 25, y: 51, mirror: true, rows: ["w......", ".w.....", "..w....", "...w...", "....w.w", ".....w."] },
    pendant: { kind: "neck", x: 25, y: 51, mirror: true, rows: ["g......", ".g.....", "..g....", "...g...", "....g.g", ".....gm", "......m"] },
  },
};
