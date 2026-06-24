# Knight's Treasure — Polish, Social & Feature Batch — Design Spec

> **Status:** Approved in brainstorming 2026-06-24. Authoritative for this batch. Builds on
> the v3 game (economy/stamina/ranks/halls/glory/map/daily-duty already shipped, commit `0f3fb23`)
> and the design-decisions doc (`2026-06-21-knights-treasure-design-decisions.md`).
> **Next step:** writing-plans → phased implementation plan.

## 1. Goal & scope

Polish the existing systems and add the social/meta layer the game has been missing:
playable daily quests, a richer economy/merchant UX, audio, branching NPC conversations,
a trophy-hall Glory, time-windowed leaderboards, a mailbox, and a set of fixes.

Everything ships **local-first** behind clean seams. Three features that would normally need a
server — leaderboards, rank-1-3 player comments, and mail-from-others — are driven by a **local
simulation** designed so a future Firebase backend is a *data-source swap, not a rewrite*.

## 2. Locked decisions (from brainstorming)

| # | Decision |
|---|---|
| Social data | **Local simulation, online-ready seam** (`services/social.js`, Firebase-shaped async API). |
| Voice lines (#3) | **Branching text conversations** (≥2 exchanges), portrait speaker-swap. No audio VO. |
| Quest (#1) | **Playable daily levels + accept/track flow.** Daily Puzzle = fixed daily-seed board; Daily Challenge = a level with a **rotating daily modifier**; Guild Quest stays passive multi-step. |
| Economy (#2) | **Earned gold ×0.5** (level rewards + quest coin payouts). Item costs unchanged. Single tunable constant. |
| Daily Challenge modifier | **Rotating**, one per day chosen by date seed from {no power-ups, no mistakes, speed-run, reduced flip-memory}. |
| Nav | **Left rail = Glory · Ranks**; **right rail = Quests · Inn · Smith**; **Mail = top-bar mailbox icon + unread badge**. Blacksmith leaves the Inn; rail label "Smith". |
| Glory (#5, fix #2) | **Trophy hall** — achievements + completion + your placement history. Leaderboard removed from Glory. |
| Ranks (#6) | **Leaderboards** — Daily / Weekly / Monthly / All-Time tabs + a **Stage** board; rank-1-3 **broadcast comment** (≤100 chars); top bots show comments. |
| Mail (#7) | Mailbox; types rank-up / rank-down / achievement / comment; **broadcast rule**; post-sync achievement **full-page fanfare** (once per achievement). |
| Fanfare ("fun fair") | Confetti/ember + sound on purchase & gambler win; full-page for achievements; `settings.fanfare` toggle. |
| Audio (#4) | `audio.js` (Web Audio). System + **synth placeholder SFX** now; real music/SFX are an **asset to-do**. |

## 3. Cross-cutting architecture

### 3.1 Save schema → v4 (non-destructive migration, same pattern as v1→v3)

Add to `defaultSave()` + defensive coercions in `migrate()` (bump `SAVE_VERSION` to 4):

```
achievements: {}          // id -> true (earned); backed by the achievement registry
rankHistory: {}           // scope -> best place, e.g. { weekly: 3, allTime: 41, stage: {1:2} }
mail: []                  // [{ id, type, title, body, date, read }]
broadcast: { text: '', locked: false, changedOnce: false }
settings.fanfare: true    // celebration toggle (sound/music already exist)
dailyDuty: { ...v3, accepted: {}, dailyLevelDone: {} }   // accept/track + which daily level cleared
pendingFanfare: []        // achievement ids awaiting a full-page celebration on next launch
```

Migration fills any missing field from defaults; never destructive.

### 3.2 `services/social.js` — the online seam (local simulation)

One module, a **Firebase-shaped async API** (returns Promises so swapping in Firestore later is
mechanical). Pure-ish: reads `save`, returns data; mutations take `save` and the caller persists.

```
getLeaderboard(scope, save) -> Promise<[{ rank, name, title, score, you?, comment? }]>
getMyPlacement(scope, save) -> Promise<{ rank, score }>
getStageLeaderboard(stage, save) -> Promise<[...]>
submitBroadcast(save, text) -> { ok }        // writes save.broadcast
getMail(save) -> save.mail
syncMail(save) -> mutates save.mail from local triggers (placement/achievement deltas)
```

**Simulation model:**
- A **seeded roster of ~60 bot knights** generated deterministically from a fixed seed (stable
  names, titles, base scores spanning ~1,500–9,500). Helper: a small seeded PRNG so the roster is
  identical every run but varied.
- **You** are inserted by your real **Glory score** = `totalStars*12 + clearedLevels*8 + coins`
  (already used by the v3 leaderboard).
- **Time-windowed boards** (daily/weekly/monthly/all-time) re-seed bot scores by the current
  date bucket, so each window's order differs and feels alive; all-time uses base scores.
- **Stage board** ranks bots + you by best score for that stage (`save.bestScores`).
- **Comments**: top-3 bots carry pre-written motivational lines from a pool; your own line comes
  from `save.broadcast.text` and appears when you place top-3.
- **Placement history**: after computing a board, if your rank improved on the stored best in
  `rankHistory`, update it (drives Glory's "Best: 3rd · Weekly" + a rank-up mail).

**Swap path:** replace the bodies of these functions with Firestore reads/writes; signatures and
the save shape stay identical.

### 3.3 `audio.js` — Web Audio system (with placeholders)

- AudioContext lazily created on first user gesture (mobile autoplay rule).
- **SFX**: a buffer pool keyed by id (`tap, match, mismatch, coin, win, lose, powerup, dice,
  fanfare, mail`). Until real files exist, each id maps to a **short synthesized tone/noise**
  (oscillator/noise burst) so the game has audio feedback immediately.
- **Music**: one looping gain-controlled source per stage/scene with a short crossfade on change;
  lazy-loaded per stage; **no real tracks yet** → music is silent/placeholder until assets land.
- Honors `settings.sound` (SFX) and `settings.music` (music). Suspends on app background (resumes
  on foreground — ties into the lifecycle seam).
- Public API: `sfx(id)`, `music(stageOrScene)`, `stopMusic()`, `setEnabled(sound, music)`.

### 3.4 Economy rebalance

`economy.js`: wrap the final payout in `levelReward(...)` and the daily-duty coin rewards with a
single `EARN_MULTIPLIER = 0.5` (`Math.round(total * EARN_MULTIPLIER)`). One source of truth.

## 4. Nav restructure

- **Right rail** (`.kt-rail`): Quests · The Inn · **Smith** (new). Smith opens the Blacksmith
  scene directly (no longer a tavern sub-area; remove it from the Inn's halls row).
- **Left rail** (`.kt-rail.left`, mirrored position): Glory · Ranks.
- **Top bar**: identity (unchanged) + a new **mailbox button** (`#kt-mail`) with an unread-count
  badge (count of `mail.filter(!read)`), beside the menu button.
- New nav icons needed: **Smith** + **Mail** (placeholders: anvil/envelope inline SVG until art
  lands — see §10 asset prompts).
- `main.js` routing: `openBlacksmith()` from the rail; `openMail()` from the top-bar icon; Inn's
  `onHall` drops `blacksmith`.

## 5. Feature designs

### 5.1 Quests — playable daily + accept flow (#1)
- Quest list gains an **Accept** button per task → sets `dailyDuty.accepted[id]`. Accepted tasks
  show as tracked; unaccepted show "Accept".
- **Daily Puzzle**: an **Accept → Play** that launches a real level built from a **fixed daily
  seed** (same board for everyone that day; deterministic shuffle from the date). Clearing it sets
  `dailyDuty.dailyLevelDone.puzzle` → the task completes → reward claimable.
- **Daily Challenge**: **Accept → Play** launches a normal-difficulty level with the **day's
  rotating modifier** applied (no-power-ups / no-mistakes-allowed / speed-run / reduced
  flip-memory). Modifier shown on the card. Completing under the rule completes the task.
- **Guild Quest**: unchanged (passive multi-step "win 3 levels").
- Launching a daily level routes through the normal stamina-gated play flow (costs 1 stamina) but
  to a dedicated daily level, not the campaign pointer (does not advance `currentStage/Level`).
- `dailyDuty.js` gains: `dailySeed()`, `dailyModifier()`, `acceptTask`, `markDailyLevelDone`.

### 5.2 NPC conversations (#3)
- `data/story.js` beats gain an optional `lines: [{ who:'npc'|'knight', text }]` (≥2 entries).
  When present, the encounter plays them as a sequence; when absent, falls back to the single
  `text` (back-compat).
- `showStoryDialog` (in `ui/story.js`) becomes a **stepper**: shows line[i], swaps the portrait
  (NPC portrait vs the knight portrait `knight/knight_*`), advances on tap/continue; Skip ends the
  whole sequence; the last line calls `onDone`. Lang toggle + scrim unchanged.
- Author ≥2-exchange conversations for each stage's opening/midpoint/boss beats (knight gets a
  reply). Knight portrait expression chosen per beat mood.

### 5.3 Glory — trophy hall (#5, fix #2)
- Remove the Leaderboard tab (moves to Ranks). Glory becomes single-view.
- **Achievement registry** `data/achievements.js`: `{ id, name, desc, group, test(save) }`.
  Groups: **Progress** (clear L1, clear a stage…), **Mastery** (50★/250★, 3-star a level, reach
  each rank), **Stage Conquests** (one per stage: "First to clear Stage N" — earned when
  `"{n}-25"` in completedLevels), **Social** (place top-3 in any board, send a broadcast).
- Layout: a **grid of trophy tiles** (earned = lit + check; locked = dim + lock), with a
  per-achievement **completion** readout where it's a count (e.g. "Stages cleared 7/10").
- A compact **"Your placements"** strip from `rankHistory` ("Best: 3rd · Weekly · 41st All-Time").
- Earned-state is **derived** via `test(save)` each render; `save.achievements` records the
  first-earned moment (for the mail/fanfare trigger), set during a post-result `checkAchievements`.

### 5.4 Ranks — leaderboards (#6)
- Tabs: **Daily / Weekly / Monthly / All-Time**, plus a **Stage** selector board. Powered by
  `services/social.js`.
- Row: position · knight name · title · score; **you** highlighted. Top-3 rows show their
  **comment**.
- **Broadcast (rank 1-3):** when `getMyPlacement(scope)` is top-3, show a "Leave a word for the
  realm" affordance → a ≤100-char input → `submitBroadcast`. Per the rule (§5.5) it can be the
  random one (changeable once) or the player's own (locked).
- Async states: loading skeleton rows while the (Promise-based) sim resolves; never block the UI.

### 5.5 Mail (#7)
- **Mailbox scene** (`ui/mail.js`): list of `mail` items, unread dot, tap to open body, mark read;
  empty state ("No ravens today"). Reached from the top-bar mailbox icon.
- **Types & triggers** (generated locally by `social.syncMail` on launch / after results):
  - **rank-up / rank-down** — when a scope placement crosses a stored best/worse.
  - **achievement** — when a new achievement is earned.
  - **comment** — a top-bot "motivational comment" delivered to your mailbox.
- **Broadcast rule:** when you first become top-3, a mail invites a motivational message.
  - **Decline → a random line is assigned**, and it is **changeable once** (`broadcast.changedOnce`
    gates the single re-roll/edit).
  - **Submit your own → locked forever** (`broadcast.locked = true`).
- **Post-sync achievement fanfare:** on launch, `social.syncMail` may surface new achievements →
  push to `save.pendingFanfare`; the home, on mount, drains the queue and plays a **full-page
  fanfare** (banner + confetti + sound) once per achievement, then clears it.

### 5.6 Merchant UX & feel (#2 sub-items, #others)
- **Not-enough-coin:** replace the plain toast with a themed **merchant modal line** (the NPC says
  it: Innkeeper / Gambler / Blacksmith voice), e.g. "Come back when your purse is heavier, knight."
- **Blacksmith first-open dialogue:** add `NPC.blacksmith` (portrait + intro line) and run the same
  first-open `showStoryDialog` the Inn/Bard/Gambler use (`seenIntros.blacksmith`).
- **Dice jump:** the Gambler dice get a **jump/bounce** keyframe on roll (translateY arc) layered
  on the existing face-tumble.
- **Gambler loss:** on a loss, swap the gambler **portrait to a smug/taunt expression** and change
  the **line above** the table (not just the result text).
- **Fanfare:** a reusable `fanfare(scene, level)` — `level: 'small'` (ember/confetti burst + `sfx`)
  for purchases & gambler wins; `level: 'page'` (full-screen banner + confetti + sound) for
  achievements. Both gated by `settings.fanfare`. Add the toggle to Settings.

## 6. Fixes

| # | Fix |
|---|---|
| F1 | **Missed tile clicks:** replace the `.kt-in` entrance `transform:scale(0)` with an **opacity + small translateY** entrance so tiles keep full hit-area from frame one. (Keep `prefers-reduced-motion` off-switch.) |
| F2 | **Leaderboard out of Glory** — handled by the Glory/Ranks split (§5.3/§5.4). |
| F3 | **Abandon warning:** in-game Home/Story buttons open a **confirm modal** ("Leave now and you forfeit this level — stamina won't be refunded"); confirm proceeds, cancel stays. **Settings stays an overlay; the timer keeps running** (intended) — note it in the Settings header copy. |
| F4 | **Power-up/item use animations** — distinct cast effects per power-up + a drink-use flourish (§5.6 `fanfare` shares the particle helper). |
| F5 | **Score floor:** clamp final `computeScore` result to **≥ 0** (`Math.max(0, …)`); the mistakes line still itemizes in the breakdown. |
| F6 | **Banner text fit:** retune `.kt-ov-banner-label` (top%, font-size, max-width) **per `.victory`/`.defeat`** so the label sits inside the scroll art (ref the two attached screenshots — text currently sits slightly low/wide). |

## 7. Settings additions
- **Fanfare** toggle (`settings.fanfare`) — celebrations on/off.
- (Sound/Music toggles already exist and now drive `audio.js`.)
- Settings header copy notes the in-game timer keeps running while open.

## 8. File map

**New:** `services/social.js`, `systems/audio.js`, `data/achievements.js`, `ui/mail.js`,
`ui/fanfare.js` (+ `css/mail.css`, fanfare styles), Smith/Mail nav icon placeholders.
**Changed:** `core/save.js` (v4), `data/config.js` (SAVE_VERSION 4), `data/story.js` (lines),
`data/npc.js` (blacksmith), `systems/economy.js` (×0.5), `systems/dailyDuty.js` (accept/daily
level/modifier), `systems/match.js` + `data/levels.js` (daily seed/modifier hook), `ui/home.js`
(split rails + mailbox + pendingFanfare drain), `ui/game.js` (F1 entrance, F5 floor, F3 confirm,
power-up animations, daily-level + modifier), `ui/story.js` (conversation stepper), `ui/glory.js`
(trophy hall, drop leaderboard), `ui/ranks`→ new Ranks leaderboard scene, `ui/inn.js` (drop
blacksmith hall), `ui/gambler.js` (dice jump + loss line), `ui/blacksmith.js` (first-open intro +
not-enough modal), `ui/settings.js` (fanfare toggle), `ui/modal.js` (merchant modal), `main.js`
(routing for Smith/Mail, abandon confirm), `css/main.css` (banner label), `css/home.css` (left
rail + mailbox), `css/animations.css` (entrance, dice jump, cast effects, fanfare), `index.html`
(new css links).

## 9. Phasing (for the implementation plan)

1. **Fixes & feel** (F1–F6, score floor, banner, abandon confirm, power-up/item animations).
2. **Economy & merchant UX** (×0.5, not-enough modal, dice jump, gambler loss, Blacksmith intro, fanfare helper + settings toggle).
3. **Nav restructure** (split rails, Smith to rail, Mail top-bar icon, placeholder icons).
4. **Audio** (`audio.js` + synth SFX + wiring + settings).
5. **NPC conversations** (story `lines` + dialog stepper + authored content).
6. **Quests** (accept flow + daily seed/modifier playable levels).
7. **Glory trophy hall** (`achievements.js` registry + screen + placement strip).
8. **Social seam + Ranks** (`services/social.js` + leaderboard scene + broadcast).
9. **Mail** (mailbox + triggers + broadcast rule + post-sync fanfare page).

Each phase is independently shippable and testable (gstack). **Save v4** lands as soon as the
first new field is needed (`settings.fanfare` in phase 2), with later phases adding their fields
under the same v4 bump. **`services/social.js`** lands with phase 8 (Ranks), and `audio.js` with
phase 4. New `ui/ranks.js` scene + `main.js` routing change so the **Ranks** rail tile opens the
leaderboard scene and **Glory** opens the trophy hall (today both route to Glory).

## 10. Asset prompts (image generator — placeholders used until delivered)

Match the existing gold-on-dark medieval set (square, ornate gold frame where the other nav/UI
icons have one; transparent PNG).

- **Smith (Blacksmith) nav icon** — *"A medieval blacksmith's anvil with a crossed hammer, gold
  metallic icon on a dark transparent background, ornate to match a gold-framed game UI icon set,
  square, centered, ~256px."*
- **Mail nav/top-bar icon** — *"A rolled parchment letter / sealed envelope with a wax seal, gold
  medieval game icon, dark transparent background, square, centered."*
- **Mail-type icons (×4)** — rank-up (*upward gold chevron over a shield*), rank-down (*downward
  chevron, muted*), achievement (*gold laurel star*), comment (*speech scroll*). Same style set.
- **Rank-tier leaderboard emblems** — small gold/silver/bronze place medallions (1st/2nd/3rd) for
  leaderboard rows, plus a neutral rank pip.
- **Audio (production, not images):** 10 looping **stage music tracks** (per-stage theme, ~60–90s
  loop, medieval orchestral/folk, intensity rising by stage) + an **SFX set** (tap, match,
  mismatch, coin, win sting, lose sting, power-up cast, dice roll, fanfare, mail). Until delivered,
  `audio.js` plays synthesized placeholders.

## 11. Out of scope / deferred (unchanged seams)
- Real Firebase backend (the `social.js` seam is built for it; swap later).
- Recorded voice-over (conversations are text; a future audio pass can attach VO).
- AdMob rewarded ads; Hiligaynon localization.
- Real music/SFX files (system + placeholders now; tracks are an asset to-do).
- The earlier first-pass stubs not in this batch (locked/moving tile rendering; the remaining
  stubbed power-up effects) — separate follow-up.
