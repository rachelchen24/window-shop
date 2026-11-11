// Window Shop: stores and items (spec §4, §5.5). Plain data, no code.
// Prices are in dollars. Item features follow spec §5.4; shoes, bags and
// accessories pick a hand-drawn sprite with `style` (see data/parts.js).
// unlock: { type: "start" } | { type: "periodsUnderBudget", value } |
//         { type: "totalSaved", value (dollars) } | { type: "streak", value }
globalThis.WS_CATALOG = {
  stores: [
    {
      id: "linen", name: "Linen & Co.", tagline: "Quiet luxury, neutrals, basics", unlock: { type: "start" },
      theme: { bg: "#eee8df", ink: "#3d362e", accent: "#8c7a62", font: "serif" },
    },
    {
      id: "velvet", name: "Velvet Hour", tagline: "Going-out tops, mini skirts, heels", unlock: { type: "start" },
      theme: { bg: "#2a1525", ink: "#f8e4ef", accent: "#ee4a9e", font: "serif" },
    },
    {
      id: "studio", name: "Studio Stretch", tagline: "Athleisure, sets, sneakers", unlock: { type: "periodsUnderBudget", value: 1 },
      theme: { bg: "#e4f1ed", ink: "#1d3a35", accent: "#21888a", font: "sans" },
    },
    {
      id: "y2k", name: "Y2Kute", tagline: "Early-2000s throwback, baby tees, low-rise", unlock: { type: "totalSaved", value: 100 },
      theme: { bg: "#fde4f2", ink: "#5a1b47", accent: "#ee4a9e", font: "round" },
    },
    {
      id: "thrift", name: "Thrift Theory", tagline: "Vintage, denim, cardigans", unlock: { type: "streak", value: 3 },
      theme: { bg: "#f3e9da", ink: "#4a3322", accent: "#c0703c", font: "serif" },
    },
    {
      id: "maison", name: "Maison Lumière", tagline: "Luxury gowns and designer-style bags", unlock: { type: "totalSaved", value: 500 },
      theme: { bg: "#16141c", ink: "#f2e7cf", accent: "#d9b04a", font: "serif" },
    },
  ],

  // Free outfit every new doll starts in (not sold anywhere).
  starter: [
    // Deliberately plain, so the first purchase feels like a glow-up.
    { id: "starter-tee", name: "Plain Gray Tee", price: 0, category: "top", length: "hip", fit: "oversized", neckline: "crew", sleeves: "short", color: "gray", pattern: "solid" },
    { id: "starter-leggings", name: "Old Leggings", price: 0, category: "pants", length: "maxi", fit: "fitted", leg: "skinny", color: "black", pattern: "solid" },
    { id: "starter-sneakers", name: "Canvas Sneakers", price: 0, category: "shoes", style: "chunky-sneaker", color: "white" },
  ],

  items: [
    // Linen & Co.
    { id: "linen-crew", storeId: "linen", name: "Cashmere Crew", price: 58, category: "top", length: "waist", fit: "regular", neckline: "crew", sleeves: "long", color: "oatmeal", pattern: "solid" },
    { id: "linen-cami", storeId: "linen", name: "Silk Cami", price: 45, category: "top", length: "waist", fit: "fitted", neckline: "V", sleeves: "strap", color: "cream", pattern: "satin" },
    { id: "linen-trousers", storeId: "linen", name: "Wide-Leg Trousers", price: 68, category: "pants", length: "maxi", fit: "regular", leg: "wide", color: "camel", pattern: "solid" },
    { id: "linen-skirt", storeId: "linen", name: "Linen Midi Skirt", price: 52, category: "skirt", length: "midi", fit: "regular", color: "white", pattern: "solid", detail: "slit" },
    { id: "linen-coat", storeId: "linen", name: "Belted Wrap Coat", price: 140, category: "jacket", length: "knee", fit: "oversized", neckline: "collar", sleeves: "long", color: "camel", pattern: "solid", detail: "belt" },
    { id: "linen-flats", storeId: "linen", name: "Ballet Flats", price: 48, category: "shoes", style: "ballet-flat", color: "black" },
    { id: "linen-tote", storeId: "linen", name: "Structured Tote", price: 85, category: "bag", style: "tote", color: "brown" },
    { id: "linen-hoops", storeId: "linen", name: "Gold Hoops", price: 30, category: "accessory", style: "hoops", color: "gold" },

    // Velvet Hour
    { id: "velvet-corset", storeId: "velvet", name: "Satin Corset Top", price: 42, category: "top", length: "crop", fit: "fitted", neckline: "square", sleeves: "strap", color: "black", pattern: "satin", detail: "lace-up", accentColor: "hot-pink" },
    { id: "velvet-halter", storeId: "velvet", name: "Sequin Halter", price: 48, category: "top", length: "crop", fit: "fitted", neckline: "halter", sleeves: "none", color: "silver", pattern: "sequin" },
    { id: "velvet-mini", storeId: "velvet", name: "Leather Mini", price: 45, category: "skirt", length: "mini", fit: "fitted", color: "black", pattern: "solid", detail: "zipper" },
    { id: "velvet-slip", storeId: "velvet", name: "Red Satin Slip Dress", price: 95, category: "dress", length: "midi", fit: "fitted", neckline: "scoop", sleeves: "strap", color: "red", pattern: "satin", detail: "slit" },
    { id: "velvet-ruffle", storeId: "velvet", name: "Ruffle Mini Dress", price: 78, category: "dress", length: "mini", fit: "regular", neckline: "off-shoulder", sleeves: "none", color: "hot-pink", pattern: "solid", detail: "ruffle" },
    { id: "velvet-heels", storeId: "velvet", name: "Platform Heels", price: 65, category: "shoes", style: "platform-heel", color: "black" },
    { id: "velvet-baguette", storeId: "velvet", name: "Sequin Baguette", price: 55, category: "bag", style: "baguette", color: "magenta", pattern: "sequin" },

    // Studio Stretch
    { id: "studio-bra", storeId: "studio", name: "Sculpt Sports Bra", price: 38, category: "top", length: "crop", fit: "fitted", neckline: "scoop", sleeves: "none", color: "sage", pattern: "solid" },
    { id: "studio-hoodie", storeId: "studio", name: "Cropped Hoodie", price: 52, category: "top", length: "crop", fit: "oversized", neckline: "crew", sleeves: "long", color: "lilac", pattern: "solid" },
    { id: "studio-flares", storeId: "studio", name: "Flare Leggings", price: 58, category: "pants", length: "maxi", fit: "fitted", leg: "flare", color: "black", pattern: "solid" },
    { id: "studio-biker", storeId: "studio", name: "Biker Shorts", price: 34, category: "shorts", length: "mini", fit: "fitted", leg: "skinny", color: "charcoal", pattern: "solid" },
    { id: "studio-track", storeId: "studio", name: "Zip Track Jacket", price: 72, category: "jacket", length: "hip", fit: "regular", neckline: "collar", sleeves: "long", color: "teal", pattern: "solid", detail: "zipper" },
    { id: "studio-trainers", storeId: "studio", name: "Chunky Trainers", price: 90, category: "shoes", style: "chunky-sneaker", color: "white", accentColor: "lavender" },
    { id: "studio-headband", storeId: "studio", name: "Sport Headband", price: 18, category: "accessory", style: "headband", color: "mint" },

    // Y2Kute
    { id: "y2k-babytee", storeId: "y2k", name: "Cherry Baby Tee", price: 28, category: "top", length: "crop", fit: "fitted", neckline: "crew", sleeves: "cap", color: "baby-pink", pattern: "solid", graphic: "cherry", accentColor: "red" },
    { id: "y2k-xoxo", storeId: "y2k", name: "XOXO Tee", price: 26, category: "top", length: "crop", fit: "fitted", neckline: "crew", sleeves: "short", color: "white", pattern: "solid", graphic: "xoxo", accentColor: "hot-pink" },
    { id: "y2k-flares", storeId: "y2k", name: "Low-Rise Flares", price: 62, category: "pants", length: "maxi", fit: "regular", leg: "flare", color: "sky", pattern: "denim", detail: "belt" },
    { id: "y2k-pleats", storeId: "y2k", name: "Pleated Micro Mini", price: 40, category: "skirt", length: "mini", fit: "regular", color: "hot-pink", pattern: "check", accentColor: "white" },
    { id: "y2k-velour", storeId: "y2k", name: "Velour Track Jacket", price: 68, category: "jacket", length: "hip", fit: "fitted", neckline: "collar", sleeves: "long", color: "hot-pink", pattern: "solid", detail: "zipper" },
    { id: "y2k-sandals", storeId: "y2k", name: "Platform Sandals", price: 45, category: "shoes", style: "platform-sandal", color: "baby-blue" },
    { id: "y2k-sunnies", storeId: "y2k", name: "Tinted Sunnies", price: 22, category: "accessory", style: "sunnies", color: "hot-pink" },
    { id: "y2k-clips", storeId: "y2k", name: "Butterfly Clips", price: 12, category: "accessory", style: "clips", color: "lilac" },

    // Thrift Theory
    { id: "thrift-cardigan", storeId: "thrift", name: "Grandpa Cardigan", price: 36, category: "jacket", length: "hip", fit: "oversized", neckline: "V", sleeves: "long", color: "mustard", pattern: "solid", detail: "buttons", accentColor: "brown" },
    { id: "thrift-jeans", storeId: "thrift", name: "Dad Jeans", price: 32, category: "pants", length: "maxi", fit: "regular", leg: "straight", color: "cobalt", pattern: "denim" },
    { id: "thrift-prairie", storeId: "thrift", name: "Floral Prairie Dress", price: 45, category: "dress", length: "maxi", fit: "regular", neckline: "square", sleeves: "puff", color: "cream", pattern: "floral", accentColor: "coral", detail: "ruffle" },
    { id: "thrift-plaid", storeId: "thrift", name: "Plaid Mini Skirt", price: 24, category: "skirt", length: "mini", fit: "regular", color: "red", pattern: "check", accentColor: "navy" },
    { id: "thrift-denim", storeId: "thrift", name: "Vintage Denim Jacket", price: 48, category: "jacket", length: "hip", fit: "regular", neckline: "collar", sleeves: "long", color: "cobalt", pattern: "denim" },
    { id: "thrift-leopard", storeId: "thrift", name: "Leopard Cami", price: 22, category: "top", length: "waist", fit: "fitted", neckline: "V", sleeves: "strap", color: "camel", pattern: "animal" },
    { id: "thrift-boots", storeId: "thrift", name: "Knee Boots", price: 55, category: "shoes", style: "knee-boot", color: "brown" },

    // Maison Lumière
    { id: "maison-midnight", storeId: "maison", name: "Midnight Sequin Gown", price: 680, category: "dress", length: "maxi", fit: "fitted", neckline: "strapless", sleeves: "none", color: "navy", pattern: "sequin" },
    { id: "maison-ballgown", storeId: "maison", name: "Blush Ball Gown", price: 890, category: "dress", length: "maxi", fit: "oversized", neckline: "off-shoulder", sleeves: "none", color: "blush", pattern: "satin", detail: "ruffle" },
    { id: "maison-column", storeId: "maison", name: "Emerald Column Gown", price: 740, category: "dress", length: "maxi", fit: "fitted", neckline: "halter", sleeves: "none", color: "emerald", pattern: "satin", detail: "slit" },
    { id: "maison-tweed", storeId: "maison", name: "Cropped Tweed Jacket", price: 460, category: "jacket", length: "waist", fit: "fitted", neckline: "crew", sleeves: "long", color: "cream", pattern: "check", accentColor: "black", detail: "buttons" },
    { id: "maison-chain", storeId: "maison", name: "Quilted Chain Bag", price: 520, category: "bag", style: "chain-bag", color: "black" },
    { id: "maison-heels", storeId: "maison", name: "Crystal Heels", price: 340, category: "shoes", style: "platform-heel", color: "silver", pattern: "sequin" },
    { id: "maison-pearls", storeId: "maison", name: "Pearl Necklace", price: 180, category: "accessory", style: "pearls", color: "white" },
  ],
};
