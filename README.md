# ServiceFlow

AI-assisted independent portfolio project. An employee service request portal for the fictional company Northstar Studio. Synthetic data only. Not a production system; do not enter real or confidential information.

## Run
Serve `dist/` with any static server (for example `python3 -m http.server -d dist 8123`) or open `dist/index.html`.

## Test
- `node --test tests/core.test.cjs` unit tests
- `node tests/static_check.cjs` static checks
- `python3 -I tests/browser_check.py 8123` browser checks (needs Playwright and Chromium, server running)

## Docs
Everything is in `dist/delivery/` (also linked from the Delivery case study view). Regenerate with `python3 scripts/build_docs.py`.

## Limits
Data lives in the browser (localStorage). No sign-in, no shared storage, no notifications. See `dist/delivery/QA_Evidence.md` for tested scope and gaps.
