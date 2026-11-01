/**
 * Chapter 1's content, printed (phase SM2b, chunk 135.2): the nodes, quests,
 * foes, hazards and items of the map a new game starts on, and its regions in
 * story order (`World/chapter1-content.ts`).
 *
 * Usage:
 *   npm run chapter1-content -w axiomancer-mechanics            # a readable listing
 *   npm run chapter1-content -w axiomancer-mechanics -- --json  # the whole content as JSON
 *
 * The nightly sim report (`scripts/sim-report.mjs`, chunk 135.6) reads the
 * `--json` form as the universe its coverage section lists "never reached"
 * against, and the regions its pacing section groups by. A reading, not a gate.
 */

import { chapter1Content, type ChapterContent } from '../World/chapter1-content';

/** The readable listing: regions with their nodes, then the counts of each kind. */
export function renderContent(c: ChapterContent): string {
    const lines: string[] = [`Chapter 1: ${c.map} (${c.continent}), start ${c.startNodeId}, exit ${c.exitNodeIds.join(', ') || '-'}`, ''];
    lines.push('Regions, in story order:');
    for (const region of c.regions) {
        const gate = region.gateId ?? 'the start';
        const nodes = region.nodeIds.map(id => {
            const n = c.nodes.find(x => x.id === id)!;
            const tags = [n.kind ?? 'waypoint', n.role, ...(n.gate ? ['gate'] : []), ...(n.elite ? ['elite'] : []), ...(n.boss ? ['boss'] : []), ...(n.exit ? ['exit'] : [])];
            return `    ${id} (${tags.join(', ')})${n.place ? ` ${n.place}` : ''}`;
        });
        lines.push(`  ${region.index}. past ${gate}: ${region.nodeIds.length} nodes`, ...nodes);
    }
    lines.push('', 'Quests:');
    for (const q of c.quests) {
        lines.push(`  ${q.id}${q.main ? ' (main)' : ''}: ${q.steps.length} steps`);
        for (const s of q.steps) lines.push(`    ${s.step}. ${s.questName} at ${s.nodeId}${s.turnInNodeId ? `, turned in at ${s.turnInNodeId}` : ''}`);
    }
    lines.push('', `Enemies (${c.enemies.length}):`);
    for (const e of c.enemies) lines.push(`  ${e.id}: ${e.stagings.map(s => `${s.nodeId}@${s.level ?? '-'}${s.difficulty ? ` ${s.difficulty}` : ''}`).join(', ')}`);
    lines.push('', `Hazards (${c.hazards.length}): ${c.hazards.map(h => h.id).join(', ')}`);
    lines.push('', `Items (${c.items.length}):`);
    for (const i of c.items) lines.push(`  ${i.id} (${i.category}): ${i.sources.join(', ')} at ${i.nodeIds.join(', ')}`);
    return lines.join('\n');
}

function main(argv: readonly string[]): void {
    const content = chapter1Content();
    process.stdout.write(argv.includes('--json') ? `${JSON.stringify(content, null, 2)}\n` : `${renderContent(content)}\n`);
}

if (require.main === module) main(process.argv.slice(2));
