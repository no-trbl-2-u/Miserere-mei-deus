#!/usr/bin/env node
/**
 * automation/agent-e2e.mjs — Phase 26 unit 6.
 *
 * Run a Phase 20 scripted walkthrough against `npm run game`, capture the
 * state-log + JSON event stream + human stderr, and ask the Claude API
 * to decide whether the test goal was achieved. Prints a structured
 * pass/fail decision and exits 0 on pass / 1 on fail.
 *
 * Usage:
 *   node automation/agent-e2e.mjs <script.json> <goal.md>
 *
 * Env:
 *   ANTHROPIC_API_KEY   required. The grading layer is intentionally
 *                       non-hermetic — it phones home to Claude.
 *   AGENT_MODEL         optional. Defaults to 'claude-sonnet-5-5'.
 *
 * This harness sits outside the vitest hermetic-e2e contract on
 * purpose. It's a validation layer for the CLI's full feature surface,
 * not a test that runs in CI.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';

const DEFAULT_MODEL = 'claude-sonnet-5-5';
const API_URL = 'https://api.anthropic.com/v1/messages';

function die(message, code = 1) {
    process.stderr.write(`agent-e2e: ${message}\n`);
    process.exit(code);
}

function usage() {
    return 'Usage: node automation/agent-e2e.mjs <script.json> <goal.md>';
}

const [scriptPath, goalPath] = process.argv.slice(2);
if (!scriptPath || !goalPath) die(usage());
if (!fs.existsSync(scriptPath)) die(`script not found: ${scriptPath}`);
if (!fs.existsSync(goalPath)) die(`goal not found: ${goalPath}`);

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
    die('ANTHROPIC_API_KEY is not set. Export it before running.');
}
const model = process.env.AGENT_MODEL || DEFAULT_MODEL;

const goalText = fs.readFileSync(goalPath, 'utf-8');
const stateLogPath = path.join(os.tmpdir(), `agent-e2e-${randomUUID()}.jsonl`);
// A scratch snapshot slot the CLI's Save / Load tabs can write to.
// Harmless for walkthroughs that don't touch Save / Load; required
// for the ones that do (Phase 27 unit 2's save-load walkthrough).
const saveFilePath = path.join(os.tmpdir(), `agent-e2e-${randomUUID()}.save.json`);

// Run the CLI under test with --script + --json-events + --state-log.
// Note: `npm run game -- ...` forwards flags through npm's argument
// passthrough. We invoke ts-node directly to skip the npm shim.
const tsNodeArgs = [
    'ts-node',
    'src/CLI/game.cli.ts',
    '--script', scriptPath,
    '--json-events',
    '--state-log', stateLogPath,
    '--save-file', saveFilePath,
];

// On Windows npx is npx.cmd, which Node refuses to spawn without a shell.
const child = spawn('npx', tsNodeArgs, { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });

let stdoutBuf = '';
let stderrBuf = '';
child.stdout.on('data', chunk => { stdoutBuf += chunk.toString('utf-8'); });
child.stderr.on('data', chunk => { stderrBuf += chunk.toString('utf-8'); });

child.on('close', async exitCode => {
    let stateLogContent = '';
    try { stateLogContent = fs.readFileSync(stateLogPath, 'utf-8'); } catch { /* may not exist */ }
    try { fs.unlinkSync(stateLogPath); } catch { /* ignore */ }
    try { fs.unlinkSync(saveFilePath); } catch { /* ignore — may not have been written */ }

    const verdict = await gradeWithClaude({
        goal: goalText,
        stateLog: stateLogContent,
        eventsJsonl: stdoutBuf,
        humanLog: stderrBuf,
        exitCode,
    });

    process.stdout.write('\n──────── agent-e2e verdict ────────\n');
    process.stdout.write(`script:    ${scriptPath}\n`);
    process.stdout.write(`goal:      ${goalPath}\n`);
    process.stdout.write(`exitCode:  ${exitCode}\n`);
    process.stdout.write(`decision:  ${verdict.decision}\n`);
    process.stdout.write(`reasoning: ${verdict.reasoning}\n`);
    process.stdout.write('───────────────────────────────────\n');

    process.exit(verdict.decision === 'pass' ? 0 : 1);
});

async function gradeWithClaude({ goal, stateLog, eventsJsonl, humanLog, exitCode }) {
    const userPrompt = [
        'You are grading an automated end-to-end test of the axiomancer-mechanics CLI.',
        '',
        '## Test goal (markdown)',
        '',
        goal,
        '',
        '## State log (newline-delimited JSON; each line = one state mutation)',
        '',
        '```jsonl',
        stateLog.trim() || '(empty)',
        '```',
        '',
        '## JSON event stream (CLI stdout in --json-events mode)',
        '',
        '```jsonl',
        eventsJsonl.trim() || '(empty)',
        '```',
        '',
        '## Human log (CLI stderr — prose output, not authoritative)',
        '',
        '```',
        humanLog.trim() || '(empty)',
        '```',
        '',
        `## CLI exit code`,
        '',
        `${exitCode}`,
        '',
        '## Your job',
        '',
        'Decide whether the test goal was achieved. Return ONLY a JSON object',
        'with these fields and nothing else (no prose, no code fence):',
        '',
        '  {"decision": "pass" | "fail", "reasoning": "<one or two sentences>"}',
        '',
        'Be terse. Cite specific log entries / event types when relevant.',
    ].join('\n');

    const body = {
        model,
        max_tokens: 512,
        messages: [{ role: 'user', content: userPrompt }],
    };

    const resp = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!resp.ok) {
        const errText = await resp.text();
        die(`Claude API ${resp.status}: ${errText}`);
    }

    const data = await resp.json();
    const text = (data.content || []).map(b => b.text ?? '').join('').trim();

    // Strip any accidental ``` fences the model may have added.
    const cleaned = text
        .replace(/^```(?:json)?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();

    try {
        const parsed = JSON.parse(cleaned);
        if (parsed.decision !== 'pass' && parsed.decision !== 'fail') {
            return { decision: 'fail', reasoning: `agent returned unexpected decision value: ${JSON.stringify(parsed)}` };
        }
        return parsed;
    } catch (e) {
        return { decision: 'fail', reasoning: `agent returned non-JSON response: ${text.slice(0, 200)}` };
    }
}
