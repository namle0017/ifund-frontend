# AGENTS.md — Frontend repository
Read docs 01–17 and master prompt; this repo owns Next.js responsive VI/EN UX, screens, accessibility and generated BE client. Follow 04,07,10,14,15,16. FE must never invent NAV, fee, tax, holdings, ML results or call ML directly. Show official/predicted NAV vs exchange market price separately, timestamps, disclaimers and error states. Test guest/investor/admin flows and mobile accessibility. Ask owner only for unresolved material design decisions in consolidated kickoff.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
