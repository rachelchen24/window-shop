# Window Shop: Spec

## 1. Concept

A game that helps people cut back on shopping, especially online shopping. You set a real-life budget and log what you actually spend. Whatever you **don't** spend becomes in-game cash. Your avatar spends it at in-game stores, wears what it buys, and builds a digital closet. You get the fun of shopping without spending real money.

**Scope for now:** women's fashion (clothing and accessories). No makeup or hair yet.

### Constraints
- **No bank or card connection.** The user types in their budget and every real-life purchase by hand. The game takes their word for it.
- **The first build takes 20–30 minutes.** It covers entering a budget, logging spending, and seeing the wallet and total saved. Stores, the avatar and the closet come right after, as time allows.

## 2. Core loop

1. Set a budget (daily, weekly or monthly).
2. Log real purchases during the period.
3. Watch the counters: **real money left**, **in-game cash**, **total saved**.
4. Shop the in-game stores with in-game cash.
5. Dress the avatar from the closet.
6. Save streaks unlock new stores, so saving more means more to shop.

## 3. Money system

### 3.1 Budget
- The user picks a **period** (day, week or month) and an **amount**.
- Periods reset automatically: a new day at midnight, a new week on Monday, a new month on the 1st.
- The budget can be changed. A change applies from the next period.

### 3.2 Expense log
- Each entry has an amount, a note (optional, e.g. "Target run") and a date (defaults to today).
- Entries can be edited and deleted.
- No bank connection. Everything is entered by hand, on the honor system.

### 3.3 In-game cash (the wallet)
- **Earned each period = max(0, budget − real spend)**.
- Earnings arrive in the wallet **when the period closes**. Until then the screen shows a live preview: "You're on track to earn $140."
  - *Why:* if cash arrived as you went, you could spend it in the game and then overspend in real life.
- Unspent in-game cash **carries over** between periods, so you can save up for big items.
- Overspending in real life earns **$0** that period. It never takes away cash already in the wallet. The game rewards saving and doesn't punish; a bad week just means no new cash.

### 3.4 Total saved (the motivation counter)
- **Total saved = the sum of (budget − real spend) over all closed periods**, counting only periods where that number is positive.
- It is **separate from the wallet**. Buying things in the game never lowers it. It's the real money kept in your pocket.
- It is always visible on the home screen and in the header, e.g. "💰 $1,240 saved".
- Supporting stats:
  - Current saving streak (periods in a row under budget)
  - Best streak
  - This period's saving so far (live)
  - Milestone celebrations at $50, $100, $250, $500, $1k and so on (confetti and a badge)
- Optional fun comparisons: "That's 3 pairs of jeans you didn't buy."

## 4. Stores

### 4.1 Approach
- All stores live **inside the game**. The player never goes to real store websites.
- The stores are **made up, with their own branding**. Each one is styled after a familiar kind of shop but has no real brand names or logos (to avoid trademark trouble and free advertising for real stores).
- Each store has its own name, colors, look and stock.

### 4.2 Starter lineup (draft)
| Store | Style | Unlock |
|---|---|---|
| **Linen & Co.** | Quiet luxury, neutrals, basics | Unlocked at start |
| **Velvet Hour** | Going-out tops, mini skirts, heels | Unlocked at start |
| **Studio Stretch** | Athleisure, sets, sneakers | 1 period under budget |
| **Y2Kute** | Early-2000s throwback, baby tees, low-rise | $100 total saved |
| **Thrift Theory** | Vintage, denim, cardigans | 3-period streak |
| **Maison Lumière** | Luxury: gowns, designer-style bags | $500 total saved |

### 4.3 Store features
- A product grid showing each item's name, price and preview.
- **Try on**: the item shows on the avatar before buying. This is the key fun moment.
- Buy, which moves the item to the closet.
- Locked stores show up dimmed with how to unlock them ("Save $100 to unlock Y2Kute"), to keep players aiming for the next one.
- Later: rotating "new arrivals", sales and limited drops, to keep that "go check the store" feeling.

### 4.4 Pricing
- In-game prices are close to real-world prices (a top is about $25–60 and a dress $50–150), so a week's savings buys roughly what it would buy in real life. The trade feels like a fair one.

## 5. Avatar and clothing

### 5.1 The avatar must really wear what's bought
Every item that can be bought has a **simplified drawing that fits the avatar**. Buying a red satin midi dress means the avatar shows up in a red midi dress. This is the most important part of the game feeling real.

### 5.2 Art style: pixel fashion dolls
- **Look:** big-headed fashion dolls in the early-2000s style (the Bratz-doll look). That means:
  - an oversized head
  - huge eyes with lashes
  - glossy lips
  - a tiny torso and long, thin legs
  - chunky platform shoes
  - a glam, trendy attitude
- **Original characters only.** We borrow the general style, not Bratz itself: no Bratz names, logos, characters or exact face designs. Bratz is a trademark owned by MGA Entertainment, so our dolls need their own faces and personalities.
- **Pixel art:** the doll and all clothes are low-resolution pixel sprites, shown scaled up with sharp pixel edges. Pixels hide detail, which is good: clothes only have to read as "red satin midi dress", not be realistic.
- **The doll's grid:** one fixed pose on a **64 × 128 pixel** canvas, shown at 4× (256 × 512 on screen).
  - Head: about 40% of the height (rows 0–50)
  - Torso: rows 50–72
  - Hips: rows 72–80
  - Legs: rows 80–118
  - Feet and platforms: rows 118–128
- **Skin tones are color swaps.** The doll is drawn with a few fixed "skin" colors that the game replaces at draw time, so many skin tones cost no extra art.
- **One body shape in the first version.** Every new body shape means redrawing every clothing piece for it, so more body options come later (see open questions).

### 5.3 Layers
Clothes are stacked layers. Each item belongs to one slot, drawn from bottom to top:
1. Doll base: body and underwear
2. Shoes
3. Bottoms (skirt, pants, shorts)
4. Tops
5. One-piece (dress or jumpsuit; replaces top and bottoms)
6. Outerwear (jacket, coat, cardigan)
7. Bag
8. Accessories (jewelry, sunglasses, hat)
9. Hair (drawn last so it sits over jackets)

### 5.4 Turning real clothes into doll clothes
The doll has cartoon proportions, so real garments can't simply be shrunk to fit. Every garment is instead described by a **few simple features**, and the game builds the pixel version from **pre-drawn parts** that already fit the doll.

**Step 1: Describe the real garment with simple features.**

| Feature | Options (each one snaps to the nearest) |
|---|---|
| Category | top, dress, skirt, pants, shorts, jacket, shoes, bag, accessory |
| Length | crop, waist, hip, mini, knee, midi, maxi |
| Fit | fitted, regular, oversized |
| Neckline | crew, V, scoop, square, halter, strapless, off-shoulder, collar |
| Sleeves | none, strap, cap, short, elbow, long, puff |
| Pants leg | skinny, straight, wide, flare, cargo |
| Color | 1 main + up to 1 accent, picked from a 32-color palette |
| Pattern | solid, stripes, check/plaid, floral, polka dot, animal, denim, satin shine, sequin sparkle |
| Signature detail (max 1) | belt, buttons, zipper, ruffle, bow, slit, cut-out, lace-up |

**Simplification rules:**
- Keep only what can be seen at doll size. Drop tiny details like seams, stitching and small hardware.
- **Keep one signature detail at most.** If a real top has ruffles, buttons and a bow, keep the one that makes it recognizable.
- Exaggerate a little in the doll style: platforms get chunkier, flares get wider, crop tops get cropped higher.
- No logos or brand prints. Graphic tees use simple made-up graphics such as a heart, star, cherry or "XOXO".

**Step 2: Build the pixel version from parts.**
- Every option above has a **pre-drawn part** fitted to the doll grid: a mask showing which pixels it covers, plus a dark outline.
  - Examples: "torso, V-neck", "sleeve, puff", "hem, midi", "legs, flare".
- To build a garment:
  1. Combine the parts it needs (a top is torso + neckline + sleeves + length).
  2. Fill that shape with the pattern tile (a small repeating 4 × 4 or 8 × 8 pixel block).
  3. Shade it automatically: from the main color, make a darker shadow, a lighter highlight and an outline color.
  4. Add the signature detail on top.
- A small set of parts covers hundreds of garments: about 9 categories, a few lengths and fits, and the necklines and sleeves, times 32 colors and 9 patterns. Nobody draws each item by hand.
- **Shoes, bags and accessories** are a small set of whole hand-drawn sprites (platform heel, chunky sneaker, knee boot, mini bag, tote, hoops, sunglasses…) that are just recolored.

**Step 3: Where the features come from.**
- **Store catalog (first version):** we write the features for each in-game item by hand in a data file. The items follow real trends ("the satin slip skirt everyone has this season"), not copies of a specific brand's product.
- **Later, from real products:** for the "Resisted It" feature, an AI model that understands images looks at a product photo (or a screenshot the user uploads) and fills in the features. The user can adjust anything before saving. The real photo is shown only on the user's own Resisted wall and is never turned into store stock.

**Example:** a real "red satin cowl-neck midi slip dress with a thigh slit" becomes
`{ category: dress, length: midi, fit: fitted, neckline: scoop, sleeves: strap, color: red, pattern: satin, detail: slit }`.
That turns into a red pixel midi dress with straps, a satin shine and a slit, on a doll in platform heels.

### 5.5 Item data
```
Item {
  id, storeId, name, price, slot,
  category, length, fit, neckline, sleeves, leg,
  color, accentColor, pattern, detail
}
```

### 5.6 Closet
- A grid of everything owned, filterable by slot and store.
- Tap to put on or take off. Putting on a dress removes the top and bottoms.
- **Save outfits**: name a look and put it back on with one tap.
- Later: outfit of the day, a "wear count", and sharing outfit cards.

## 6. Screens

1. **Onboarding**: name, avatar look, budget period and amount.
2. **Home**: the avatar in its current outfit, plus total saved, wallet, this period's progress bar and streak.
3. **Log spending**: quick-add amount and note, with a list of this period's expenses.
4. **Mall**: a grid or map of stores, locked and unlocked.
5. **Store**: the products, try-on and buy.
6. **Closet**: what's owned, putting items on and saved outfits.
7. **Stats**: savings history chart, streaks and milestones.

## 7. Data model (draft)

```
Settings   { period: "day"|"week"|"month", budget: number, startDate }
Expense    { id, amount, note, date }
Period     { start, end, budget, spent, earned, closed: bool }
Wallet     { balance }
Stats      { totalSaved, currentStreak, bestStreak, milestones[] }
Store      { id, name, theme, unlockRule }
Item       { id, storeId, name, price, slot, template, color, pattern }
Owned      { itemId, purchasedAt }
Avatar     { skinTone, bodyType, equipped: { slot: itemId } }
Outfit     { id, name, equipped: { slot: itemId } }
```

## 8. Tech (MVP)

- A web page that runs entirely in the browser (HTML, CSS and JavaScript). No server.
- Data is stored in the browser's local storage (`localStorage`). No accounts.
- The doll and clothing are pixel sprites. The page draws them in a `<canvas>` on the 64 × 128 grid, layered by slot, with pixel smoothing turned off when scaled up so edges stay sharp.
- Parts, pattern tiles and the color palette live in plain data files, so new parts and items can be added without code changes.
- Later: user accounts, syncing across devices, and wrapping it as a phone app.

## 9. MVP checklist

- [ ] Onboarding: set the budget period and amount
- [ ] Expense log with this period's total
- [ ] Period closing: earnings added to the wallet, total saved and streak updated
- [ ] Home screen with total saved, wallet and progress
- [ ] 2 unlocked stores and 1 locked one, about 6 items each
- [ ] Try-on preview and buying
- [ ] Avatar with layered slots that really wears what's equipped
- [ ] Closet: put on and take off items

## 10. Later and stretch

- **"Resisted It" wall**: paste a link or screenshot of something you almost bought in real life, along with its price. The game makes an avatar version, and the real photo goes on a wall saying "You didn't spend $89 on this."
- Makeup and hair
- More stores, seasonal collections and limited drops
- Push reminders to log spending
- Sharing outfits with friends

## 11. Open questions

- Should overspending have a gentle consequence (for example, the streak resets but nothing else happens)? Current plan: only the streak resets.
- Should in-game cash ever expire, to encourage playing? Current plan: no.
- How much choice for avatar bodies and skin tones in the first version? Current plan: one body shape and about 6 skin tones. Each extra body shape means redrawing every clothing part.
- Who draws the doll base and the clothing parts? Do we draw them ourselves, hire a pixel artist, or start with placeholder art?
- Should the doll have a few preset characters with names and personalities, or be fully custom?
- Should "Resisted It" amounts count toward total saved? Current plan: no, to avoid counting the same savings twice. Show them as a separate stat instead.
