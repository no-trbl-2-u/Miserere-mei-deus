// scripts/art/prompt.mjs — the prompt compiler (phase 73).
//
// `subject spec -> request`. Deterministic and pure: the same spec compiles to
// the same string, byte for byte, because the compiled prompt is recorded in
// `provenance.json` and a prompt that drifts between runs makes that record a
// lie. It is also what makes the compiler testable without a backend.
//
// Prompts are source code (design doc §4.2): reviewed, versioned, diffable.

import crypto from 'node:crypto'

import { sheetClause, sheetSize, validateFrames } from './sheet.mjs'
import { CATEGORY_RULES, NEGATIVE, PREAMBLE, STYLE_VERSION } from './style.mjs'

/**
 * @typedef {object} SubjectSpec
 * @property {string} slug      kebab-case; becomes the filename
 * @property {string} category  a key of CATEGORY_RULES; the destination dir
 * @property {string} subject   what the thing IS, one or two sentences
 * @property {string} [detail]  distinguishing marks, worn state, held objects
 * @property {string[]} [avoid] subject-specific negatives, beyond the standing ones
 * @property {{cols:number, rows:number, poses?:string[]}} [frames] ask for one grid
 *   sheet of animation frames instead of one figure (enemies only; see sheet.mjs)
 */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Throws with the specific problem, so a bad spec fails at compile not spend. */
export function validateSpec(spec) {
  const problems = []
  if (!spec || typeof spec !== 'object') return ['spec is not an object']
  if (!SLUG_RE.test(String(spec.slug ?? ''))) {
    problems.push(`slug must be kebab-case, got ${JSON.stringify(spec.slug)}`)
  }
  if (!CATEGORY_RULES[spec.category]) {
    problems.push(
      `category ${JSON.stringify(spec.category)} has no composition rule — `
        + `known: ${Object.keys(CATEGORY_RULES).join(', ')}`,
    )
  }
  if (!spec.subject || String(spec.subject).trim().length < 12) {
    problems.push('subject must say what the thing is (12+ chars)')
  }
  problems.push(...validateFrames(spec))
  return problems
}

/**
 * Compile a spec into the request the adapter sends.
 *
 * Order is fixed — style, then composition, then subject, then negatives — so
 * two prompts differ only where their specs do, and a diff of two provenance
 * records reads as a diff of intent.
 */
export function compile(spec) {
  const problems = validateSpec(spec)
  if (problems.length) throw new Error(`prompt: invalid spec — ${problems.join('; ')}`)

  const avoid = [...NEGATIVE, ...(spec.avoid ?? [])]
  const prompt = [
    PREAMBLE,
    CATEGORY_RULES[spec.category],
    `Subject: ${String(spec.subject).trim().replace(/\s+/g, ' ')}`,
    spec.detail ? `Detail: ${String(spec.detail).trim().replace(/\s+/g, ' ')}` : null,
    spec.frames ? sheetClause(spec.frames) : null,
    `Avoid: ${avoid.join(', ')}.`,
  ].filter(Boolean).join('\n\n')

  return {
    slug: spec.slug,
    category: spec.category,
    prompt,
    styleVersion: STYLE_VERSION,
    // The hash identifies the exact text without storing it twice, and lets a
    // later run tell "same intent, new model" from "prompt was edited".
    promptHash: crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16),
    ...(spec.frames ? { frames: spec.frames, size: sheetSize(spec.frames) } : {}),
  }
}

/** Read a subject spec from a JSON file, with the path named in any error. */
export function compileFile(fs, filePath) {
  let raw
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch (err) {
    throw new Error(`prompt: ${filePath} is not readable JSON — ${err.message}`)
  }
  try {
    return compile(raw)
  } catch (err) {
    throw new Error(`${filePath}: ${err.message}`)
  }
}
