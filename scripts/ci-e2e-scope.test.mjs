import assert from 'node:assert/strict'
import test from 'node:test'

import { classifyE2EScope } from './ci-e2e-scope.mjs'

const classify = (owner, files, forceFull = false) => classifyE2EScope({ owner, files, forceFull })

test('mobile hazard screen selects hazard plus its route-entry evidence', () => {
    const result = classify('mobile', ['axiomancer-mobile/app/hazard/index.tsx'])
    assert.equal(result.hazard, true)
    assert.equal(result.encounters, true)
    assert.equal(result.combat, false)
    assert.equal(result.full, false)
})

test('mobile subsystem component selects only its owned journey', () => {
    const result = classify('mobile', ['axiomancer-mobile/components/combat/CombatBoard.tsx'])
    assert.equal(result.combat, true)
    assert.equal(result.hazard, false)
    assert.equal(result.encounters, false)
})

test('dev-tools leaves and helpers select the journeys they can launch', () => {
    const enemy = classify('mobile', ['axiomancer-mobile/components/DebugEnemyPicker.tsx'])
    assert.equal(enemy.encounters, true)
    assert.equal(enemy.full, false)
    const travel = classify('mobile', ['axiomancer-mobile/state/dev/world-travel.ts'])
    assert.equal(travel.encounters, true)
    assert.equal(travel.full, false)
    const rewards = classify('mobile', ['axiomancer-mobile/components/DebugRewardTriggers.tsx'])
    assert.equal(rewards.encounters, true)
    assert.equal(rewards.hazard, false)
})

test('the feature map drive and a regenerated map each select an integration run', () => {
    const drive = classify('mobile', ['axiomancer-mobile/scripts/feature-map-e2e.mjs', 'axiomancer-mobile/scripts/lib/feature-map-drive.mjs'])
    assert.equal(drive.run_integration, true)
    assert.equal(drive.full, false)
    const map = classify('mobile', ['docs/feature-map/features.json'])
    assert.equal(map.run_integration, true)
    assert.equal(map.mobile, false)
    assert.equal(map.full, false)
    const unitTest = classify('mobile', ['axiomancer-mobile/scripts/feature-map-drive.test.mjs'])
    assert.equal(unitTest.run_integration, false)
})

test('the map walk script selects the encounter suite it runs with', () => {
    const result = classify('mobile', ['axiomancer-mobile/scripts/map-walk-e2e.mjs'])
    assert.equal(result.encounters, true)
    assert.equal(result.full, false)
})

test('the Act 1 walk script selects the encounter suite it runs with', () => {
    const result = classify('mobile', ['axiomancer-mobile/scripts/act1-walk-e2e.mjs'])
    assert.equal(result.encounters, true)
    assert.equal(result.full, false)
})

test('mixed mobile subsystems select the union', () => {
    const result = classify('mobile', [
        'axiomancer-mobile/components/hazard/HazardCard.tsx',
        'axiomancer-mobile/components/combat/encounter/CombatBoard.tsx',
    ])
    assert.equal(result.hazard, true)
    assert.equal(result.combat, true)
    assert.equal(result.full, false)
})

test('shared mobile runtime path fails closed to every journey', () => {
    const result = classify('mobile', ['axiomancer-mobile/store/index.ts'])
    assert.deepEqual(
        [result.hazard, result.encounters, result.combat],
        [true, true, true],
    )
    assert.equal(result.full, true)
})

test('mobile runtime asset changes fail closed while screenshots do not', () => {
    assert.equal(classify('mobile', ['axiomancer-mobile/assets/images/arena.webp']).full, true)
    assert.equal(classify('mobile', ['axiomancer-mobile/screenshots/arena.webp']).run_integration, false)
})

test('a re-stamped baseline selects one integration run and no journey', () => {
    const result = classify('mobile', ['axiomancer-mobile/screenshots/baseline/memoir.png'])
    assert.equal(result.run_integration, true)
    assert.deepEqual([result.hazard, result.encounters, result.combat, result.full], [false, false, false, false])
    // The run's own captures and diffs never reach a commit, and stay non-runtime.
    assert.equal(classify('mobile', ['axiomancer-mobile/screenshots/current/memoir.png']).run_integration, false)
    assert.equal(classify('mobile', ['axiomancer-mobile/screenshots/diff/memoir.png']).run_integration, false)
    // The baseline README is prose, not a baseline.
    assert.equal(classify('mobile', ['axiomancer-mobile/screenshots/baseline/README.md']).run_integration, false)
})

test('mobile docs and hermetic tests do not launch browser evidence', () => {
    const result = classify('mobile', [
        'axiomancer-mobile/docs/combat.md',
        'axiomancer-mobile/components/hazard/__tests__/HazardCard.test.tsx',
    ])
    assert.equal(result.run_integration, false)
})

test('mechanics Cards changes select combat', () => {
    const result = classify('mechanics', ['axiomancer-mechanics/src/Cards/cards.library.ts'])
    assert.equal(result.mobile, true)
    assert.equal(result.combat, true)
    assert.equal(result.hazard, false)
    assert.equal(result.full, false)
})

test('mechanics Hazard changes select their own journey', () => {
    const result = classify('mechanics', ['axiomancer-mechanics/src/World/Hazard/hazards.ts'])
    assert.equal(result.hazard, true)
    assert.equal(result.encounters, false)
    assert.equal(result.combat, false)
})

test('mechanics quest/rest/loot changes select encounter routing', () => {
    const result = classify('mechanics', ['axiomancer-mechanics/src/World/QuestBoard/quests.ts'])
    assert.equal(result.encounters, true)
    assert.equal(result.hazard, false)
})

test('mechanics enemy roster changes select combat and encounter routing', () => {
    const result = classify('mechanics', ['axiomancer-mechanics/src/Enemy/enemy.library.ts'])
    assert.equal(result.combat, true)
    assert.equal(result.encounters, true)
    assert.equal(result.hazard, false)
    assert.equal(result.full, false)
})

test('mechanics NPC dialogue changes select encounter routing', () => {
    const result = classify('mechanics', ['axiomancer-mechanics/src/NPCs/types.ts'])
    assert.equal(result.encounters, true)
    assert.equal(result.combat, false)
})

test('mechanics world content outside the named minigames selects encounter routing', () => {
    for (const path of [
        'axiomancer-mechanics/src/World/MapEvents/content.ts',
        'axiomancer-mechanics/src/World/Continents/Coastal-Village/maps.ts',
        'axiomancer-mechanics/src/World/Labyrinth/labyrinth.pools.ts',
        'axiomancer-mechanics/src/World/RestChoice/restchoice.content.ts',
        'axiomancer-mechanics/src/World/map.registry.ts',
        'axiomancer-mechanics/src/World/dialogue.runtime.ts',
        // Gathering minigame retired Phase 76 — its former directory is no
        // longer a dedicated suite; a path there (were it to reappear)
        // falls through to the generic World/ encounter routing.
        'axiomancer-mechanics/src/World/Gathering/gathering.ts',
    ]) {
        const result = classify('mechanics', [path])
        assert.equal(result.encounters, true, `${path} should route to encounters`)
        assert.equal(result.mobile, true, `${path} should run the mobile gate`)
        assert.equal(result.full, false, `${path} should not force the full suite`)
    }
})

test('mobile map layouts and canvas run the full mobile suite', () => {
    // The map revamp (D2/D16) rewrites these; the layout-engine parity and
    // legibility tests ride the mobile gate, so a layout-only PR must run it.
    for (const path of [
        'axiomancer-mobile/state/exploration-maps/breakwater.layout.ts',
        'axiomancer-mobile/state/exploration-maps/index.ts',
        'axiomancer-mobile/components/exploration/MapCanvas.tsx',
        'axiomancer-mobile/assets/images/maps/provenance.json',
    ]) {
        const result = classify('mobile', [path])
        assert.equal(result.mobile, true, `${path} should run the mobile gate`)
        assert.equal(result.full, true, `${path} should run the full suite`)
    }
})

test('uncoupled mechanics source remains mechanics-only', () => {
    const result = classify('mechanics', ['axiomancer-mechanics/src/Inventory/inventory.ts'])
    assert.equal(result.mobile, false)
    assert.equal(result.run_integration, false)
})

test('mechanics public index and forced backstop run everything', () => {
    for (const result of [
        classify('mechanics', ['axiomancer-mechanics/src/index.ts']),
        classify('mobile', [], true),
    ]) {
        assert.equal(result.full, true)
        assert.deepEqual(
            [result.hazard, result.encounters, result.combat],
            [true, true, true],
        )
    }
})

test('classifier changes fail closed in either owner', () => {
    assert.equal(classify('mobile', ['scripts/ci-e2e-scope.mjs']).full, true)
    assert.equal(classify('mechanics', ['scripts/ci-e2e-scope.mjs']).full, true)
})
