# ADR-0007 — Befriend is a heart skill with a mercy choice

- Status: Superseded by spec 144 (`plan/144-mr1-mercy-check.md`), 2026-11-03: befriending left the game
- Date: 2026-06-02
- Supersedes: none
- Related: `~/Workspace/decisions/CDR-0005-axiomancer-befriend-skill-and-mercy-choice.md`, ADR-0003 difficult befriending requires HP pressure

## Context

Phase 107 balance evidence shows that parameter tuning alone improved ordinary victory rates, but STRATEGIST/friendship remains dead. A cheap fix would be to lower the Coastal Tyrant HP threshold until friendship fires. That would improve the report while weakening the game.

T's doctrine is that befriending should be difficult, consequential, and content-bearing. Defend should be used when the player fears a large attack, wants to generate resources, or wants to pursue befriending — not as a free bunker. Combat remains status/resource/skill centered.

## Decision

Keep the HP gate, but move friendship initiation into an explicit skill path:

1. **Befriend** is a heart-based skill.
2. Every player starts with Befriend.
3. Befriend requires **5 heart tokens** to attempt.
4. A successful Befriend does not immediately erase player agency. It opens a mercy-choice state:
   - spare / befriend / preserve them, with text later varied by player alignment;
   - exploit the opening for a free guaranteed critical attack.
5. The exploit option is not neutral flavor. It should be tracked as an ethically meaningful act and may affect alignment, future content, enemy state, or narrative consequence.

## Anti-exploit rule

To prevent the exploit/free-critical choice from becoming a pure damage engine:

- If the player exploits a Befriend opening against an elite or miniboss, that region's boss stops gathering friendship counters entirely.
- If the player spares that elite or miniboss, that region's boss starts battle with `open-minded`.
- `open-minded` may be a status effect with no mechanical effect except qualifying a later Befriend path.
- Befriending a boss in one region should shift faction reputation: lose standing with one faction, gain with another.

Preserve but do not implement by default yet: status effects modifying Befriend cost/success, alignment-changing cost/copy/consequence, boss-specific rites, failed-attempt token policy, exploit closing future mercy paths, and reward splits by spare/exploit.

## Mechanics obligations

Implementation exposes or must preserve:

- starting-character Befriend access;
- heart-token cost or held-token threshold;
- HP-gate eligibility retained;
- a combat state or end-report shape that can represent the post-Befriend choice;
- CLI affordance for the choice;
- combat report/playtest evidence that separates:
  - pure defensive stalling;
  - intentional Befriend attempts;
  - successful spare outcomes;
  - exploit/free-critical outcomes.

## Balance obligations

Do not declare friendship sound merely because one boss can be spared. Phase 107 remains bound by the strategy gate:

- AGGRESSIVE, DEFENSIVE, MIXED, and STRATEGIST must each approach the target band;
- STRATEGIST should prove skill/status/resource mastery;
- defensive-only dominance remains a pathology;
- friendship should carry consequence and exclusive content, not become optimal pacifist loot farming.

## Remaining open questions

- Is 5 heart paid on attempt or only required to attempt?
- Does a failed attempt spend heart tokens?
- What statuses, if any, modify success chance or unlock boss-specific Befriend text?
- Does choosing exploit close the friendship route permanently for that encounter?
- Which alignment axes shift on spare vs exploit?
