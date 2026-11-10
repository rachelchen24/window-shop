# Window Shop

A shopping game that helps you spend less in real life.

Set a budget and log what you really spend. Whatever's left over becomes in-game cash, which you spend on clothes for your pixel doll. For example, with a $300/week budget, spending $160 leaves your doll $140 to shop with.

The full design is in [spec.md](spec.md).

## Run it

Open `index.html` in a browser. Nothing to install. Your data is saved in that browser.

- `?today=2026-11-23` in the URL pretends it's that date, so you can test a period ending. Test data is kept separately from your real data.
- `node --test` runs the tests (needs Node 18+).

## Files

- `data/`: plain data you can edit without touching code: the color palette, pattern tiles, doll and clothing parts, and the stores and items
- `src/money.js`: the money rules (periods, payouts, streaks, milestones)
- `src/shop.js`: the game rules (store unlocks, buying, the closet, outfits)
- `src/doll.js`: draws the pixel doll and clothes from the parts in `data/`
- `src/app.js`: the screens and saving
- `styles.css`: the styles
- `tests/`: the tests

## Status

Done: the whole MVP. Budget and spending log, wallet and payouts, six stores that unlock as you save, try-on and buying, a pixel doll that wears what you buy, the closet with saved looks, and stats.

Later: the "Resisted It" wall, makeup, new arrivals and sales.
