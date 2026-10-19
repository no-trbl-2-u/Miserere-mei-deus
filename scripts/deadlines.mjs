#!/usr/bin/env node
// scripts/deadlines.mjs — the deadline reminder (T, 2026-10-19). Zero dependencies.
//
//   node scripts/deadlines.mjs            # print the reminder
//   node scripts/deadlines.mjs --remind   # session-start hook: print the reminder, silent in CI
//   node scripts/deadlines.mjs --write    # rewrite LIVE_DEADLINES.md (the daily workflow)
//   node scripts/deadlines.mjs --today=YYYY-MM-DD   # pin the date (tests, previews)
//
// Reads plan/deadlines.md (the whole plan) and plan/steps/01_build_plan.md; the
// rules live in scripts/deadlines-lib.mjs. Never fails a session: a missing or
// malformed file prints nothing under --remind.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { dueNeeds, liveMarkdown, nextNeed, parseItems, parsePhaseRows, reminderText } from './deadlines-lib.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const todayArg = args.find((a) => a.startsWith('--today='))?.slice('--today='.length)

// The local date, so a reminder run on T's machine counts days in T's time zone.
const localToday = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

const main = () => {
    // Chats T starts only: the loop's runs in GitHub Actions stay clean.
    if (flag('remind') && (process.env.GITHUB_ACTIONS || process.env.CI)) return
    const today = todayArg ?? localToday()
    const items = parseItems(read('plan/deadlines.md'))
    const phases = parsePhaseRows(read('plan/steps/01_build_plan.md'))
    const needs = dueNeeds(items, phases, today)
    const next = nextNeed(items, phases, today)
    if (flag('write')) {
        fs.writeFileSync(path.join(ROOT, 'LIVE_DEADLINES.md'), liveMarkdown(needs, next, today))
        return
    }
    process.stdout.write(`${reminderText(needs, next, today)}\n`)
}

try {
    main()
} catch (err) {
    if (!flag('remind')) throw err
}
