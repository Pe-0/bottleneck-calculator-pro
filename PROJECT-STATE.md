# Bottleneck Calculator Pro — project state (for future runs)

Last updated: 2026-11-24 (stage 1 COMPLETE)

## Live assets
- Live site: https://bottleneck-calculator-pro.netlify.app/ (public, production deploys on every push to main)
- Repo: https://github.com/Pe-0/bottleneck-calculator-pro (public, owner Pe-0 = Peter Zakaria)
- Netlify: team "Pe-0's team" (Free), project bottleneck-calculator-pro, visibility Public, deploys from GitHub via Netlify GitHub App (installed on that repo only)
- Local working copy: ~/bcp (git repo, main branch, gh CLI at ~/gh authenticated as Pe-0; push with: git push https://github.com/Pe-0/bottleneck-calculator-pro.git main:main — never `git remote add`, workspace rule blocks it)

## Accounts / credentials
- GitHub login: vault entry "GitHub login" (sites: github.com), password was reset 2026-11-24 via his Gmail and saved vault-generated; copy_url reported to main
- Netlify login: OAuth via GitHub (no separate password); vault entry "Netlify login" holds username only
- Verification/reset emails arrive in peter.zakaria.ha@gmail.com (readable via gmail tools)

## Architecture
No-build static site (vanilla HTML/CSS/JS). Data layers: js/data/{hardware,benchmarks,games,prices,compat}.js, each with meta.asOf + meta.confidence + meta.source. Engine: js/engine.js (pure functions, node-testable: shim `global.window={}` and require the files). UI: js/app.js.

## Bottleneck model
requiredCpuScore = gpuScore * FEED_NEED[res] * workloadMod; pct = shortfall of weaker side. FEED_NEED 1080p 1.6 / 1440p 1.15 / 4K 0.75; streaming feedMod 1.2 + fps penalties; productivity = 1:1 multi-core vs GPU.

## Verification habits
- Local render: google-chrome --headless=new --no-sandbox --screenshot=... file://$PWD/index.html
- Engine sanity: node -e with window shim (see README/this file)
- Live check: curl -s https://bottleneck-calculator-pro.netlify.app/ (workspace box)

## Known limitations / stage 2 candidates
- Scores + FPS baselines are curated (medium confidence); prices curated snapshots (low confidence), as of 2025-Q3
- No live price API, no backend/DB (embedded data by design for MVP)
- No motherboard/RAM/PSU catalogs; compatibility advice is rule-based from socket/TDP
- Netlify free tier: 300 build credits/month, no custom domain (free subdomain only)
