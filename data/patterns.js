// Window Shop: pattern tiles (spec §5.4). Plain data, no code.
// Each tile repeats across a garment. Codes:
//   .  main color        a  accent color      m  half main, half accent
//   d  main shadow       h  main highlight    s  slight shadow   l  slight highlight
//   w  white             k  outline color     y  yellow          g  leaf green
// `accent` is the fallback accent when an item doesn't name one.
globalThis.WS_PATTERNS = {
  solid: { tile: ["."] },

  stripes: { accent: "white", tile: [".", ".", "a"] },

  check: { accent: "white", tile: ["aamm", "aamm", "mm..", "mm.."] },

  floral: {
    accent: "hot-pink",
    tile: [
      "........",
      "..a.....",
      ".aya....",
      "..a..g..",
      "........",
      "......a.",
      ".g...aya",
      "......a.",
    ],
  },

  "polka-dot": {
    accent: "white",
    tile: ["......", ".a....", "......", "......", "....a.", "......"],
  },

  animal: {
    accent: "chocolate",
    tile: [
      "........",
      ".aa.....",
      "a.sa....",
      ".aa...a.",
      "......aa",
      "...a....",
      "..asa...",
      "...aa...",
    ],
  },

  denim: { tile: ["l..s", ".l..", "s.l.", "...l"] },

  satin: {
    tile: [
      "..lh....",
      "..lh....",
      "...lh...",
      "...lh...",
      "...lh...",
      "..lh....",
      "..lh....",
      ".lh.....",
    ],
  },

  sequin: { tile: ["w....", "...l.", ".s...", "....h", "..l.."] },

  // Hair textures (not sold, used by the doll's hair).
  "hair-straight": { tile: ["..s."] },
  "hair-curly": { tile: [".s..", "s.l.", "..s.", ".l.s"] },
};
