# Window Shop

A shopping game that helps you spend less in real life.

Set a budget and log what you really spend. Whatever's left over becomes in-game cash, which you spend on clothes for your pixel doll. For example, with a $300/week budget, spending $160 leaves your doll $140 to shop with.

The full design is in [spec.md](spec.md).

## Run it

Open `index.html` in a browser. Nothing to install. Your data is saved in that browser.

- `?today=2026-11-23` in the URL pretends it's that date, so you can test a period ending. Test data is kept separately from your real data.
- `node --test` runs the money-rule tests (needs Node 18+).

## Files

- `src/money.js`: the money rules (periods, payouts, streaks, milestones)
- `src/app.js`: the screens and saving
- `styles.css`: the styles
- `tests/`: the money-rule tests

## Status

Done: setting a budget, logging spending, and the in-game wallet.

Next: stores, the pixel doll and the closet.
