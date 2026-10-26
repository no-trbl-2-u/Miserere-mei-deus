# External architecture

Axiomancer's game runtime and source live in this monorepo. The systems below sit outside it and support governance, research, automation, distribution, or evidence storage. None may silently become game-rules authority.

```mermaid
flowchart LR
  A[Axiomancer monorepo]
  KB[game-knowledge-base repo]
  MCP[kb-query MCP]
  AX[axio-query MCP]
  SS[SomberSoft-Memory doctrine]
  GH[GitHub + Actions]
  CL[Claude Code action]
  PW[Playwright tooling]
  EAS[Expo EAS]
  R2[Private Cloudflare R2 vault]

  KB -->|deploy| MCP
  MCP -->|cited prior art| A
  A -->|live generated catalog| AX
  SS -->|company law and CDRs| A
  A <--> GH
  GH --> CL
  GH --> PW
  GH --> EAS
  A -->|verified artifacts only| R2
```

## Integration register

### Game knowledge base

- **Owner / location:** `no-trbl-2-u/game-knowledge-base`. That repo has its own canonical sibling checkout at `/root/Workspace/SomberSoft/game-knowledge-base` — that is where the corpus is *authored and maintained*, not a read path for Axiomancer. Axiomancer never reads the corpus off local disk.
- **Purpose:** source-backed board-game rules, reception research, reusable patterns, and the Dawncaster card/keyword corpus. It supplies external prior art; it does not own Axiomancer rules.
- **Materialization:** none. Axiomancer keeps no local copy of the corpus; the remote `kb-query` MCP server (below) is the single read path. The old gitignored snapshot and the sync script that fetched it were retired on 2026-09-04.
- **Retrieval discipline:** metadata-first through the tools — `kb_overview` / `kb_find_games` / `kb_search` resolve from generated indexes and frontmatter, `kb_read_doc` opens only the selected documents, and answers preserve `kb:<game>/<document> (src-NNN)` evidence receipts.
- **MCP data flow:** `.mcp.json` points `kb-query` at `https://kb-mcp.no-trbl-2-u.workers.dev/mcp` over MCP Streamable HTTP. The KB repo deploys that Worker from its own `mcp-server/` on merge to `main`; the corpus ships as static assets, so tool answers are current as of that deploy, not as of any local sync. Six tools: overview, find-games, search, read-doc, cards, keyword.
- **Auth:** bearer token. `.mcp.json` carries `Authorization: Bearer ${KB_MCP_TOKEN}` — the reference, never the value. Claude Code expands it from the process environment and does **not** read `.env`, so the token belongs in the machine environment; that is also the only place worktrees and scheduled runs can see it. The server is fail-closed: no token yields `401`, an unconfigured Worker yields `503`. Liveness: `curl -s https://kb-mcp.no-trbl-2-u.workers.dev/health` (unauthenticated; reports build commit and doc count). Configuration and rotation are documented in the KB repo's `mcp-server/how-to-configure.md`.
- **Availability:** development/research integration. It is **not** a product-runtime dependency — no build, test, or gameplay path touches it. But within research work it is now a hard dependency rather than an accelerator: if MCP is unavailable — network, expired token, Worker down — there is no local fallback, so prior-art grounding is simply unavailable for that run. The correct behavior is to say the corpus is unreachable and mark any claim answered from model memory as UNGROUNDED. Never imply a local corpus exists.
- **Write path:** `gh issue create --repo no-trbl-2-u/game-knowledge-base --label wishlist --title "<game or topic>" --body "<why it would help>"`. The MCP server is read-only, so coverage requests go through GitHub issues, which the KB's daily scout consumes. This needs `gh` authenticated (or `GH_TOKEN`); a failure to file must be reported but does not sink the design session.
- **Secrets:** `KB_MCP_TOKEN` (above) is the relevant secret and lives in the process environment only. Filing a wishlist issue additionally needs `gh` credentials or `GH_TOKEN`. No KB credential is written into this repo.

### Cloudflare Pages — the public DevLog

- **Owner / location:** a Cloudflare Pages project (`axiomancer-devlog`, created 2026-09-22) built from this repository's `main`, live at https://axiomancer-devlog.pages.dev (first production deploy passed `check-devlog-public-live.mjs` on 2026-09-22). The build settings and the post-deploy proof are in [`docs/devlog-public-deploy.md`](./devlog-public-deploy.md). It is separate from the `axiomancer` project, which serves the game's web build.
- **Purpose:** publish the development log, its before/after evidence, and the full catalog to players. T reversed the 2026-08-15 "never meant to be public" content policy on 2026-09-20, with the spoiler cost stated (`archive-pre-revamp:plan/archive/2026-09-25-trim-t4/plan/2026-09-20-devlog-public-publish.prompt.md`).
- **Materialization:** a build, never a commit. `npm run site:public` writes `dist/devlog-public/`, which is gitignored; Pages runs the same command at deploy time and serves that directory. Phase 57's guard (`scripts/check-devlog-not-served.mjs`, its pre-commit hook, the weekly sweep) is unchanged and now covers `dist/` as well, so generated output still never enters `main`'s tree — which is what makes this publication deliberate rather than accidental.
- **What is withheld:** the maintainer's `Needs you` correspondence panel (every post says so at its foot), and every art file whose provenance cannot prove public redistribution — 19 card paintings, 52 of 77 foe portraits, 15 character portraits and 4 treasure images are UNRESOLVED and are not published. See `devlog/DESIGN.md` §10; the gate is `scripts/devlog-art-licence.mjs`.
- **Availability:** publication only. No build, test, or gameplay path depends on it; if the project is down or absent, the nightly still writes and builds the site locally.
- **Verification:** `node scripts/check-devlog-public-live.mjs <url>` after a deploy — it proves the newest post is actually served, which a healthy-looking front page does not.
- **Secrets:** none in-repo. The project is configured at the dashboard; the repo holds no Cloudflare token and no `wrangler.toml`.

### Cloudflare Pages — the card ballots

- **Owner / location:** a Cloudflare Pages project, `axiomancer-ballots`, built from this repository's `main` with branch previews on, serving `plan/card-ledger/` as it stands (no build command, output directory `plan/card-ledger`). T creates it at the dashboard in phase BV1c; until then the ballots open from disk only. Its front page is `plan/card-ledger/index.html`, one entry per card family.
- **Purpose:** T votes on a family's ballot from the phone. The shared ballot kit (`plan/card-ledger/ballot-kit.js`, phases BV1b, BV2b) autosaves the draft on the device, Save posts it unfinished as a `draft` row (the page loads the newest save on any device) and Submit posts the verdict as a `final` row to the `miserere-api` Worker, `POST /v1/ballot-verdicts`, which stores it in D1 `miserere` table `ballot_verdicts`. How to add a ballot: `plan/card-ledger/README.md`.
- **CORS:** the Worker answers the ballot routes for the origins in its `BALLOT_ORIGINS` var (`backend/wrangler.toml`): `https://axiomancer-ballots.pages.dev` and its `*.` branch previews. If the project is named differently, that var changes with it. The Worker's other routes send no CORS header.
- **Availability:** card-design tooling only. No build, test, or gameplay path depends on it; a ballot opened from disk still Generates and Copies its verdict.
- **Secrets:** none in-repo. The page asks for the API URL and `PUZZLE_API_TOKEN` on the first Save or Submit and keeps them in the browser's `localStorage` on that device; the token is never in a committed file, a URL or a query string. The repo is public, so the ballots are too (Cloudflare Access in front of the site is a follow-up if T wants it private).

### MCP servers and tool boundaries

- **`kb-query`:** remote HTTP server owned and deployed by the **external** KB repo. It is the sole route from this repo to the corpus — there is no local file fallback. Its unavailability removes prior-art grounding for that run; it never removes an Axiomancer capability, because the corpus is not rules authority.
- **`axio-query`:** repo-local stdio server at `scripts/axio-mcp-server.mjs`. It exposes current Axiomancer cards, enemies, effects, and keywords from `devlog/data/` plus `axiomancer-mechanics/docs/keyword-atlas.md`. It regenerates stale catalog data through `npm run catalog:export` when possible. It is not external data and never outranks mechanics source files.
- **`playwright`:** `.mcp.json` invokes `npx -y @playwright/mcp@latest` with isolated headless Chromium. This is development/test tooling, not runtime architecture. Native Playwright scripts remain available when MCP permissions or transport fail.
- **Failure law:** MCP may not become the only route to evidence *this repo owns*. Every MCP surface over repo-local data must retain a file, script, or CLI fallback — `axio-query` and `playwright` both do. `kb-query` is the deliberate exception (2026-09-04): the data is external and not ours to mirror, so its outage is reported as missing grounding, never routed around by a stale copy or by memory presented as fact.
- **Verification:** run `node scripts/axio-mcp-server.test.mjs` for the repo-local server. For the KB server, check `/health` for `configured:true` and a `build.commit`, then call `kb_overview` through the configured MCP client; a `401` is a client-side token problem, a `503` is a missing Worker secret.

### SomberSoft company doctrine and decisions

- **Owner / location:** remote `no-trbl-2-u/SomberSoft-Memory`; canonical local root `/root/Workspace/SomberSoft`.
- **Company law:** `/root/Workspace/SomberSoft/SOMBERSOFT_COMMAND_LEDGER.md`.
- **Company decision records:** `/root/Workspace/SomberSoft/decisions/`.
- **Repository decisions:** Axiomancer ADRs remain inside this monorepo under package or root `docs/adr/` paths.
- **Authority:** T's latest explicit decision wins. Company CDRs and the command ledger govern company-wide policy; repo ADRs govern repository architecture; live repo plans govern execution. External doctrine does not replace mechanics source as executable rules truth.
- **Availability:** required for major company-direction and cross-repository decisions, but not for compiling or running the game. If the sibling checkout is unavailable, stop decisions that depend on it rather than reconstructing doctrine from memory.
- **Secrets:** none belong in doctrine or decision records.

### GitHub and GitHub Actions

- **Owner / location:** `no-trbl-2-u/Miserere-mei-deus`; workflows are versioned in `.github/workflows/` and execute on GitHub-hosted runners.
- **Purpose:** repository hosting, issues/PRs, verification, autonomous Nexus commands, tuning/playtest jobs, dependency upkeep, and preview-build orchestration.
- **External actions and runtimes:** workflows use GitHub-maintained actions such as `actions/checkout@v4` and `actions/setup-node@v4`; Claude-powered jobs use `anthropics/claude-code-action@v1`; mobile preview builds invoke Expo's `eas-cli` service.
- **Credentials:** `GITHUB_TOKEN` is supplied by GitHub. `GH_PAT` is used when autonomous pushes must trigger downstream verification. `CLAUDE_CODE_OAUTH_TOKEN` authorizes Claude workflows. `EXPO_TOKEN` authorizes EAS preview builds. Optional notification integrations use `NOTIFY_NTFY_TOPIC` and `NOTIFY_WEBHOOK_URL`.
- **Secret boundary:** values live only in GitHub Actions secrets or ignored local environment files. Documentation and committed workflows name variables but never contain values.
- **Availability:** GitHub is required for hosted collaboration and CI, not for local engine execution. Claude workflows and notifications are automation layers; their failure must not redefine repository truth. EAS is required only for hosted preview builds.
- **Recovery:** run package verification locally (`npm run verify`) when hosted CI is unavailable. Use `gh auth status` and repository workflow logs to diagnose hosted failures; do not treat an absent cloud run as a passing deploy gate.

### Claude and browser automation

- **Claude Code action:** the reusable `.github/workflows/_claude-skill.yml` provisions Node 22, workspace dependencies, optional Playwright Chromium, ignored `.env` GitHub context, Nexus guard self-tests, and a warn-only probe of the remote `kb-query` endpoint (passing `KB_MCP_TOKEN` through as step env) before invoking Claude. These workers operate on repository state but their self-reports are not proof; commits, CI, tests, and artifacts are proof.
- **Local Judge/Sol work:** direct implementation is permitted. Delegation is optional and should be used only when parallelism or independent review adds value.
- **Playwright:** browser automation may run through MCP or package scripts. It provides visual/runtime evidence, never mechanics authority.

### Expo EAS

- **Owner / location:** Expo-hosted EAS; configuration lives in `axiomancer-mobile/`.
- **Purpose:** hosted Android/iOS preview builds after the mobile verification gate.
- **iPhone beta:** the `beta` profile builds iOS for TestFlight only (no ad hoc channel, no registered devices) and submits to App Store Connect (`submit.beta.ios`); `npm run deploy:ios-beta` in `axiomancer-mobile/`. T's Apple Developer membership, the iOS credentials and the App Store Connect API key are set up once by [`axiomancer-mobile/docs/ios-beta.md`](../axiomancer-mobile/docs/ios-beta.md).
- **Data flow:** `.github/workflows/preview-build.yml` verifies mobile, optionally runs visual smoke, then calls `npx eas-cli@latest build` with `EXPO_TOKEN`.
- **Availability:** preview/distribution only; not required for local Expo development or mechanics execution.
- **Failure behavior:** a failed or absent EAS build blocks claiming a hosted preview, but does not erase local verification evidence.

### Private Cloudflare R2 artifact vault

- **Owner / location:** private bucket `sombersoft-artifacts`; client and operating documentation live outside this repo at `/root/Workspace/SomberSoft/artifact-vault/` in SomberSoft-Memory.
- **Purpose:** durable storage for verified playtest evidence, screenshots, reports, and build artifacts. It is not a source-code mirror, database, game runtime dependency, or public CDN.
- **Key contract:** `project/kind/YYYY-MM-DD/run/filename`; uploads include SHA-256 metadata and a manifest sidecar.
- **Data flow:** a local or CI producer invokes the sibling CLI after verification; R2 stores the artifact privately; consumers list, inspect, and download by canonical key. Public bucket access is forbidden.
- **Credentials:** Cloudflare/R2 credentials remain outside this repo, locally in `/root/.config/sombersoft/cloudflare-r2.env` or in appropriately scoped CI secrets. Never copy credential values into Axiomancer files, logs, prompts, manifests, or commits.
- **Usage law:** Cloudflare must remain within the free tier. Any paid usage requires T's explicit approval. Keep Standard storage, monitor monthly storage and operation counts, and do not add automatic bulk uploads or retention expansion without a bounded estimate and guardrail.
- **Availability:** optional artifact storage. An R2 outage blocks archival claims but must not block local development, tests, or access to source-controlled evidence.
- **Recovery / use:** from `/root/Workspace/SomberSoft`, load the protected environment, set `R2_BUCKET=sombersoft-artifacts`, and use `node artifact-vault/bin/artifact-vault.js help`. Do not add a repository-relative dependency on the sibling CLI.

### The Obsidian vault

- **Owner / location:** private repo `no-trbl-2-u/miserere-vault` (T's notes); its working copy is `vault/` at the main checkout's root, ignored by this repo (`/vault/`). Phone and desktop meet through Obsidian Sync; the desktop's Obsidian Git plugin bridges to the repo.
- **Purpose:** T's goal, thread map and inbox for brainstorming and plotting with Claude. It is not rules authority and not a loop queue.
- **Data flow and conventions:** [`docs/vault.md`](vault.md); `node scripts/vault.mjs ensure|status|features` (`features` copies the generated feature map into the vault); the `/vault` command.
- **Availability:** optional. Nothing in the build, tests or CI reads `vault/`; a cloud session must have the repo attached before `ensure` can clone it.

## Architecture rules

1. **No external service owns game rules.** `axiomancer-mechanics` source and tests remain executable authority.
2. **Accelerators over repo-owned data require fallbacks.** MCP and hosted agents may accelerate work over this repo's own files but cannot become the sole path to them. Externally owned evidence (the KB corpus) may legitimately have a single route; when that route is down, the answer is "unavailable, ungrounded", not a substitute source.
3. **External writes are explicit.** KB wishlist pushes, GitHub mutations, EAS builds, and R2 uploads must identify their destination and verification evidence.
4. **Secrets never cross into Git.** Commit variable names and recovery procedures, never values.
5. **Artifacts are not source truth.** R2 preserves evidence; Git preserves source and durable repository decisions.
6. **Failure is labeled by boundary.** Distinguish local product failure from unavailable KB, MCP, GitHub, Claude, Expo, notification, or R2 infrastructure.
7. **New external architecture updates this document.** Any new hosted service, sibling repository, MCP server, external datastore, or required agent runtime must be added here with owner, authority, credentials, fallback, and recovery procedure.
