# ADR-0003 — Difficult befriending requires HP pressure

Status: Superseded by spec 144 (`plan/144-mr1-mercy-check.md`), 2026-11-03: befriending left the game  
Date: 2026-06-01  
Scope: axiomancer-mechanics

## Decision

Difficult enemies require HP pressure before befriending can resolve or become likely. This follows Pokémon-like capture pressure: the player weakens the foe before mercy has decisive force.

## Context

Coastal Tyrant evidence showed high timeout and low friendship resolution. Pure patience could build friendship counter but still fail because the HP gate remained unmet.

## Consequences

- Playtest policies must include wound-then-spare paths.
- Boss/elite `befriendabilityConfig` should expose or imply HP gates when difficulty calls for it.
- Balance should treat timeout-heavy mercy as failure unless explicitly documented as intentional.
- Consumer UI should explain why mercy cannot resolve yet when HP gates block friendship.

## Links

- Phase 101 — Coastal Tyrant mercy-route tuning
- `Enemy.befriendabilityConfig.hpGate`
