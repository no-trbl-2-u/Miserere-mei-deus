// The /narrate skill's front-matter description ends on its refusal: it never
// writes cards or rules text, nor a speaker with no cast entry (T, 2026-11-12;
// plan/177-nv1-narrator-voice.md, A18). The sentence is pinned exactly so a
// softening edit turns this red.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SKILL = join(ROOT, '.claude/skills/narrate/SKILL.md')

/** The front-matter `description:` value (one line). */
function description() {
  const text = readFileSync(SKILL, 'utf8').replace(/\r\n/g, '\n')
  const front = text.match(/^---\n([\s\S]*?)\n---\n/)
  assert.ok(front, 'SKILL.md opens with front matter')
  const line = front[1].split('\n').find((l) => l.startsWith('description:'))
  assert.ok(line, 'front matter has a description')
  return line.slice('description:'.length).trim()
}

test('the narrate description ends on its refusal sentence, exactly', () => {
  const sentences = description().split(/(?<=\.)\s+/)
  assert.equal(sentences.at(-1), 'Never for cards or rules text, or for a speaker with no cast entry.')
})
