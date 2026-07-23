> **SUPERSEDED (2026-07-23):** Describes the retired memory-match design. See `docs/superpowers/specs/2026-07-23-match3-heist-pivot-decisions.md` for the current match-3 dungeon-heist design.

# Knight's Treasure — Plan Index & Later-Phases Outline

> **Purpose:** One place to see the whole planned build, what's fully detailed vs. outlined, and what each remaining plan will cover. Detailed TDD plans for Phases 2–6 are written **after** the vertical slice (Plans 1–3) ships, so they're informed by what the slice teaches us — not speculative. This honors the project's exactness rule (project `CLAUDE.md`).

## Source documents
- **Roadmap + challenges report:** `C:\Users\USER\.claude\plans\shiny-crafting-key.md`
- **Design decisions & mechanics spec (authoritative):** `docs/superpowers/specs/2026-06-21-knights-treasure-design-decisions.md`
- **Project rules:** `D:\Workspace\KnightTreasure\CLAUDE.md`

## Plan status

| Plan | Scope | Status |
|---|---|---|
| **Plan 1** | Foundation & core loop (scaffold, match, difficulty, scoring, save v1, state, game scene, device build) | ✅ Written — `2026-06-20-knights-treasure-foundation-core-loop.md` |
| **Plan 2** | Economy + Blacksmith + power-up framework (Raven) + scene transitions + save v2 | ✅ Written — `2026-06-21-plan-2-economy-blacksmith-powerups.md` |
| **Plan 3** | Stamina + story dialog + level map + tutorial + audio + save v3 | ✅ Written — `2026-06-21-plan-3-stamina-story-map-tutorial-audio.md` |
| **Plan 4** | Mechanics & power-up breadth (Hidden/Moving/Locked/Decoy + all 12 power-ups + interaction matrix) | ◻ Outlined below — detail after slice |
| **Plan 5** | Content: all 250 levels, 10 stage themes, boss template, full story | ◻ Outlined below |
| **Plan 6** | Tavern hub (Innkeeper/Bard/Gambler/Daily Duty) + ranks/titles + full economy sources | ◻ Outlined below |
| **Plan 7** | Services: Firebase cloud save + leaderboard, AdMob, Hiligaynon i18n | ◻ Outlined below |
| **Plan 8** | Polish & release: achievements, lifecycle, animation/audio pass, Play Store | ◻ Outlined below |
| **Asset track** | Style guide → knight → stage sets → NPCs → badges → 10 music tracks (parallel, off critical path) | ◻ Outlined below |

Plans 1–3 = the **vertical slice** (Stage 1 end-to-end). Plans 4–8 = **replication + breadth**.

---

## Plan 4 — Mechanics & power-up breadth
**Builds on:** `mechanics.js` framework seam + the Raven pattern.
**Pure modules (TDD):**
- `mechanics.js` — pluggable tile modifiers applied to a board: `decoy` (D6), `hidden` (D7 flip-factor), `moving` (D8 telegraphed swap scheduler — pure tick function `nextSwap(state, now)`), `locked` (D9 progressive unlock + Holy Water).
- `powerups/effects.js` — one pure handler per effect id where logic is pure (e.g. `revealOnePerm`, `removeLocks`, `scoreMultiplier`); timer effects (`addTime`, `pauseTimer`) return intents the game scene applies.
- `interactions.js` — encodes the D12 matrix (reveal pauses movement; reveals never validate decoys; permanent reveals pin tiles).
**DOM:** extend the game scene's power-up tray to render all owned, level-legal power-ups (max 2 active, D11), with each effect's animation; movement scheduler hooked to `requestAnimationFrame`.
**Deliverable:** any single stage's mechanic set is playable with the full power-up kit; interaction matrix verified by unit tests + on-device spot checks.

## Plan 5 — Content: 250 levels, 10 stages, bosses, story
**Pure (TDD):**
- `difficulty.js` — already the single source; add the cross-stage curve (sawtooth) and the boss template (D4): `bossParams(stage)`.
- `levels.js` — `generateAll()` → 250 configs; per-stage `theme`, `mechanics`, `decoyCount`/`lockedCount`/`moveInterval`, boss gimmick.
- `data/story.js` — all 30 beats + ending (extend the Stage-1 shape).
**DOM/content:** stage-themed backgrounds + tile sets (placeholders → assets), per-stage music selection, full level map across 10 stage nodes with the animated path + walking mascot.
**Deliverable:** all 250 levels playable with correct difficulty/mechanics and story; difficulty tuning pass on device.

## Plan 6 — Tavern hub, ranks, full economy
**Pure (TDD):**
- `tavern.js` — buy/consume consumables (reuses `inventory.js`); Knight's Brew "next-level 2★ floor" flag.
- `gambler.js` — dice roll (45% win, +1 stamina / −1 coin), hourly try caps + ad extension, cooldown (server-time seam).
- `dailyDuty.js` — three task types + all-3 bonus + streak rewards; daily reset at local midnight (server time once online).
- `ranks.js` — rank/title derivation from progress + streaks.
- `economy.js` — remaining earn sources (daily login/streak, stage milestones, ad reward counters with the D13 caps).
**DOM:** Tavern main room + Bard's Corner (songs/lore) + Gambler's Den + Daily Duty board scenes; rank badge in HUD; mascot reactions on map.
**Deliverable:** complete out-of-level economy & social loop, all local.

## Plan 7 — Services & localization (fills the deferred seams)
- **Firebase Firestore:** `services/cloudSync.js` (local-first, last-write-wins on `saveVersion`+timestamp, sync at level/stage boundaries) + `services/leaderboard.js` (score writes guarded by security rules / Cloud Function validation — challenge #5). Anti-cheat: server recompute + sanity caps.
- **AdMob:** `services/ads.js` rewarded-ad bridge (Capacitor), G-rated/non-personalized per D5, GDD caps, graceful no-fill fallback.
- **Hiligaynon:** translate `config.js TEXT` + story into a HIL table; EN/HIL toggle in settings; native-speaker review gate.
**Deliverable:** cloud save + global leaderboard + ads + two languages, behind the seams already present.

## Plan 8 — Polish & release
- Achievements + daily-streak title unlocks; full CSS animation pass; procedural BGM loop (replaces the `audio.js` stub) + audio mix.
- Android lifecycle (challenge #17): hardware back button, background pause (game timer + `AudioContext.suspend/resume`).
- Performance pass on the Redmi (challenge #14): profile 6×4 boards + particles.
- Play Store: content rating (D5), privacy policy, keystore signing (`upload` alias), release build.
**Deliverable:** shippable Play Store build.

## Asset production track (parallel)
1. **Style guide + palette sign-off** (red/gold/silver/brown) — single human approval gate (owner open item #4).
2. Knight (start ~4 expressions — YAGNI, challenge #8) → Stage 1 set → remaining stages → NPCs → badges.
3. 10 stage music tracks (lazy-loaded per stage).
4. Swap placeholders → finals via `assets/`; no code changes.

---

## Owner decisions still needed before the relevant plan starts
(From the design-decisions doc, Part "Open items" — money/legal/brand, not delegated):
- **Before Plan 7:** monetization model (IAP vs ads-only); Firebase project + AdMob app-id ownership; Hiligaynon translator.
- **Before Asset track bulk production:** art-direction sign-off.

## Recommended order
Plans 1 → 2 → 3 (slice, in order) → review → 4 → 5 → 6 → 7 → 8, with the asset track running parallel from after the style-guide sign-off. The MVP cut line (roadmap doc) can ship after Plan 6 if timeline pressure hits (English-only, no services).
