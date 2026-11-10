// Window Shop: color palette (spec §5.4). Plain data, no code.
// Garments pick a main color (and optional accent) from these 32 colors.
// Skin tones, hair colors and eye colors are the doll's color swaps (spec §5.2).
globalThis.WS_PALETTE = {
  colors: {
    black: "#25212b",
    charcoal: "#45414f",
    gray: "#8f8c99",
    silver: "#c8ccd8",
    white: "#f8f6f3",
    cream: "#f1e6d0",
    oatmeal: "#d8c7a9",
    camel: "#c39a68",
    brown: "#7a4c32",
    chocolate: "#4d2e24",
    burgundy: "#7d1f3f",
    red: "#d42b3d",
    coral: "#f2715f",
    peach: "#f7b59b",
    blush: "#f1c3cd",
    "baby-pink": "#f8b6d4",
    "hot-pink": "#ee4a9e",
    magenta: "#bf2a8c",
    lilac: "#cdb0ec",
    lavender: "#a98cd8",
    purple: "#6c43a3",
    navy: "#26335f",
    cobalt: "#3c66b9",
    sky: "#86b7e3",
    "baby-blue": "#bcdcf5",
    teal: "#21888a",
    mint: "#aee6cf",
    sage: "#9fb69a",
    olive: "#717646",
    emerald: "#178a5f",
    mustard: "#d8a43b",
    gold: "#d9b04a",
  },

  // Each tone is the set of fixed "skin" colors swapped in at draw time.
  skins: {
    porcelain: { label: "Porcelain", main: "#fbe2d4", shadow: "#efc2b1", light: "#fff2ea", line: "#b8806f", lips: "#e06f8a" },
    light: { label: "Light", main: "#f4caa9", shadow: "#e2a989", light: "#fde2cb", line: "#a7684f", lips: "#d95e7a" },
    medium: { label: "Medium", main: "#e0a87d", shadow: "#c78861", light: "#efc29c", line: "#8a5237", lips: "#c9506c" },
    tan: { label: "Tan", main: "#c78c5e", shadow: "#aa6f46", light: "#daa678", line: "#6f4023", lips: "#b8495f" },
    brown: { label: "Brown", main: "#93613f", shadow: "#784b2e", light: "#aa7751", line: "#4b2a17", lips: "#a83f55" },
    deep: { label: "Deep", main: "#5f3b27", shadow: "#4b2c1b", light: "#784b31", line: "#2a160c", lips: "#933548" },
  },

  hairColors: {
    black: { label: "Black", main: "#2c2632" },
    espresso: { label: "Espresso", main: "#4b3027" },
    chestnut: { label: "Chestnut", main: "#7c4a2b" },
    auburn: { label: "Auburn", main: "#a9462b" },
    honey: { label: "Honey", main: "#d7a659" },
    platinum: { label: "Platinum", main: "#efe3bd" },
    pink: { label: "Pink", main: "#f08cbf" },
    lavender: { label: "Lavender", main: "#b39ae6" },
  },

  eyeColors: {
    brown: { label: "Brown", main: "#6b3f24" },
    hazel: { label: "Hazel", main: "#8c6a2b" },
    green: { label: "Green", main: "#3e8a50" },
    blue: { label: "Blue", main: "#3f7fd0" },
    violet: { label: "Violet", main: "#8a5ad0" },
    gray: { label: "Gray", main: "#6f7f90" },
  },

  // Fixed makeup colors on the base doll.
  face: {
    eyeshadow: "#d991bd",
    liner: "#1d1720",
    eyeWhite: "#fbfaf8",
    gloss: "#ffe0ea",
    blush: "#f29aa8",
  },

  // Fixed colors used by sprite codes and pattern tiles.
  fixed: {
    white: "#fbfbfb",
    black: "#1c1922",
    gold: "#e2b744",
    goldDark: "#a67b1f",
    silver: "#d7dbe3",
    yellow: "#f3d04a",
    leaf: "#5e9a4d",
    pink: "#f59ac1",
    underwear: "#f3ecee",
  },
};
