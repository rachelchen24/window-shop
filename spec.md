# Window Shop: Spec

## 1. Concept

A game that helps people cut back on shopping, especially online shopping. You set a real-life budget and log what you actually spend. Whatever you **don't** spend becomes in-game cash. Your avatar spends it at in-game stores, wears what it buys, and builds a digital closet. You get the fun of shopping without spending real money.

**Scope for now:** women's fashion (clothing and accessories). No makeup or hair yet.

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

### 5.2 How it's built
- The avatar is a stylized 2D figure drawn as vector art (SVG), with a few skin-tone and body options.
- Clothes are **stacked layers**. Each item belongs to one slot:
  1. Shoes
  2. Bottoms (skirt, pants, shorts)
  3. Tops
  4. One-piece (dress or jumpsuit; replaces top and bottoms)
  5. Outerwear (jacket, coat, cardigan)
  6. Bag
  7. Accessories (jewelry, sunglasses, hat)
- **Item = shape template + color + pattern.** A handful of templates (e.g. midi dress, mini skirt, crop top, wide-leg jeans, blazer, sneakers) combined with colors and patterns (solid, stripes, floral, check, denim, satin sheen) makes a large catalog without drawing each item by hand.

### 5.3 Closet
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
- The avatar and clothing are vector drawings (SVG) layered by slot.
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
- How much choice for avatar bodies and skin tones in the first version?
- Should "Resisted It" amounts count toward total saved? Current plan: no, to avoid counting the same savings twice. Show them as a separate stat instead.
