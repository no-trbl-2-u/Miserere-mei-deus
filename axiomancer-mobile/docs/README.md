# Documentation — Axiomancer Mobile

> This directory contains design notes, architectural decisions, and
> technical guidance for Axiomancer Mobile development.

## Quick reference

| File | Purpose | Priority |
|------|---------|----------|
| [`testing.md`](./testing.md) | Hermetic E2E testing standard | **ESSENTIAL** |
| [`presenters.md`](./presenters.md) | Presenter layer contract and patterns | **ESSENTIAL** |
| [`state.md`](./state.md) | State management and store architecture | **HELPFUL** |
| [`adr/`](./adr/) | Architectural Decision Records | **REFERENCE** |

## Core testing documentation

| File | Coverage | Priority |
|------|----------|----------|
| [`testing.md`](./testing.md) | Hermetic E2E testing standard | **ESSENTIAL** |
| [`testing-guide.md`](./testing-guide.md) | Extended testing guidance and patterns | **HELPFUL** |
| [`E2E_INVENTORY.md`](./E2E_INVENTORY.md) | Complete E2E test suite catalog | **REFERENCE** |

## Engine integration

The engine (`axiomancer-mechanics`) is a sibling workspace consumed as
local source via the `@mechanics` alias — the historical npm-pin
upgrade guides were removed (git history preserves them).

The presenter boundary is stated in [`presenters.md`](./presenters.md) and
[ADR-0001](./adr/ADR-0001-engine-truth-and-presenter-boundary.md); the rules
of play live in [`docs/game-model.md`](../../docs/game-model.md).

## Hazard minigame documentation

The hazard docs live in `axiomancer-mechanics/docs/` (`encounters/hazard.md`, `hazard-minigame-api.md`, `hazard-playtest-2026-06-10-spec.md`); the balance-recommendations and card-expansion docs were archived 2026-09-30 to `archive-pre-revamp:plan/archive/2026-09-30-revamp-r6b/`; the mobile copies and `hazard-v2-vs-mechanics-divergence.md` were archived 2026-09-25 to `archive-pre-revamp:plan/archive/2026-09-25-trim-t1/`.

## Design and UX documentation

| File | Coverage | Priority |
|------|----------|----------|
| [`combat.md`](./combat.md) | Combat system design documentation | **HELPFUL** |

## Architecture Decision Records (ADRs)

The [`adr/`](./adr/) folder contains durable mobile architecture and
product decisions. Each ADR documents a significant architectural choice:

| File | Decision Topic | Priority |
|------|---------------|----------|
| [`adr/ADR-0001-engine-truth-and-presenter-boundary.md`](./adr/ADR-0001-engine-truth-and-presenter-boundary.md) | Engine as source of truth, presenter patterns | **ESSENTIAL** |
| [`adr/ADR-0003-mobile-does-not-invent-mechanics.md`](./adr/ADR-0003-mobile-does-not-invent-mechanics.md) | Engine authority over game mechanics | **ESSENTIAL** |
| [`adr/ADR-0002-visual-baselines-are-committed-evidence.md`](./adr/ADR-0002-visual-baselines-are-committed-evidence.md) | Visual regression testing approach | **HELPFUL** |
| [`adr/ADR-0006-nexus-state-reconciliation-precedes-ui-polish.md`](./adr/ADR-0006-nexus-state-reconciliation-precedes-ui-polish.md) | Development priority guidance | **HELPFUL** |
| [`adr/ADR-0004-combat-terminology-prefers-player-language.md`](./adr/ADR-0004-combat-terminology-prefers-player-language.md) | Combat UI terminology decisions | **REFERENCE** |
| [`adr/ADR-0005-reference-screenshots-and-generated-smoke-baselines-are-distinct.md`](./adr/ADR-0005-reference-screenshots-and-generated-smoke-baselines-are-distinct.md) | Testing baseline methodology | **REFERENCE** |
| [`adr/ADR-0007-befriend-mercy-choice-modal.md`](./adr/ADR-0007-befriend-mercy-choice-modal.md) | Combat mercy choice interaction (superseded by spec 144) | **REFERENCE** |

See [`adr/README.md`](./adr/README.md) for ADR process and templates.

## Development workflow guides

| File | Coverage | Priority |
|------|----------|----------|
| [`docs/truth-sources.md` § Source-of-truth hierarchy](../../docs/truth-sources.md#source-of-truth-hierarchy--decision-authority) (root, one copy for the monorepo) | Decision-making authority and conflict resolution | **ESSENTIAL** |
| [`store-submission-checklist.md`](./store-submission-checklist.md) | App store submission process and requirements | **REFERENCE** |

## Navigation

For the complete project structure and quick start guide, see the
[main README](../README.md). For planning and build process
documentation, see [`plan/`](../../plan/) at the monorepo root.