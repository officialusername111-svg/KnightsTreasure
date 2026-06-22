# Knight's Treasure — Implementation Execution Strategy

> How the three written implementation plans (Plan 1 foundation/core loop, Plan 2 economy/shop, Plan 3 stamina/story/map/tutorial/audio) will be executed. This is a *process* spec, not a code spec — the plans already contain the code and tests. **Date:** 2026-06-22 · **Approach:** strictly sequential, subagent-driven, quality-first.

## Goal
Execute the plans with the **tightest correctness** for a foundation everything else builds on — prioritizing review rigor over speed. Multiple agents are used (implementer + reviewers), but **one task is in flight at a time** (no parallelism, no worktrees).

## Execution model — sequential, one task at a time
The unit of work is a **single plan task**. Tasks run in strict dependency order: Plan 1 → Plan 2 → Plan 3, each plan's tasks in their written order (the plans are already dependency-ordered). For every task:

1. **Implement** — a fresh general-purpose subagent receives exactly one task (the plan gives it the failing test, the implementation code, and the `Consumes/Produces` interface). It runs the TDD cycle: write failing test → run (fail) → implement → run (pass) → commit.
2. **Review gate — Stage 1 (correctness vs spec):** a fresh reviewer subagent checks the output against the task's requirements, its interface block, and the plan's **Global Constraints** — verifying the tests truly exercise the behavior, signatures match, no placeholders, no spec drift.
3. **Review gate — Stage 2 (quality):** DRY/YAGNI, naming, file focus, dead code, consistency with surrounding code.
4. **Orchestrator verify (me):** run the **full `npx vitest run`** (regression, not just the new test), confirm green, and confirm the produced interface matches what downstream tasks consume.
5. **Accept → next task.** Any real issue → fix → re-review → only then advance. Nothing advances on a failing or regressed suite.

## Order, setup & checkpoints
- **Task 0 first:** scaffold + `git init` + Vitest (subagent-driven needs per-task commits). Fold in copying `.claude/assets/_READY_FIX_NOBG → www/assets/images/{characters,tiles,ui,badges,backgrounds,store}` so final art is in place from the start.
- **Within a plan:** tasks proceed under the two-stage gate; progress reported as each lands.
- **At each plan boundary** (end of Plan 1 / 2 / 3): **stop and check in with the owner**, and run the plan's **on-device acceptance** (Capacitor build to the Redmi Note 9 Pro). Evidence shown — no "done" claims without test/device output (verification-before-completion).
- **Escalation:** if a review surfaces a real design question (e.g. one of the open GDD decisions in the design-decisions doc), pause and bring it to the owner rather than letting a subagent guess (per the project's no-assume rule).

## UI sample-and-approve gate (owner's global rule)
Before any subagent builds a **UI task** (game scene/HUD/board styling in Plan 1; Blacksmith scene in Plan 2; map/story/tutorial scenes in Plan 3), present a **visual sample** (mockup or rendered preview) and get the owner's approval first; iterate until approved. Only then does implementation of that scene begin. Pure-logic and scaffold tasks are exempt.

## Guardrails
- The plan's **Interfaces** (Consumes/Produces) and **Global Constraints** are the contract every implementer and reviewer checks against — including the **type-consistency** check across tasks (the failure mode most likely to break a sequential build).
- Pure-logic modules stay framework-free and Node-testable; difficulty values come only from `difficulty.js`; save migrations never destroy data (merge-over-defaults). All already specified in the plans.
- Single workspace; no worktrees needed (sequential).

## Roles
- **Orchestrator (me):** dispatch each task, run the regression suite, gate acceptance, integrate, track progress, surface checkpoints/escalations.
- **Implementer subagent:** one task, TDD per the plan.
- **Reviewer subagents:** fresh eyes, two stages (correctness, then quality) per task.

## Terminal / next step
The brainstorming skill's usual terminal is *writing-plans*, but the three implementation plans already exist — there is no new code spec to plan. So the next step after the owner approves this strategy is to invoke **superpowers:subagent-driven-development** and begin with Plan 1, Task 0.
