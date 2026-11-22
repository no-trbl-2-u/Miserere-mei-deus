// Pins the guard's pre-bash rules (.claude/hooks/guard.mjs) and the shell
// reader they match on (guard-shell.mjs). Each rule must still block its real
// target, and the old whole-string false positives (plan/AUDIT.md: a word in a
// heredoc body, a quoted -m message or a file path) must now pass.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { checkBash, checkCommand } from './guard.mjs'
import { effectiveWords, gitCall, parseShell, parseOpts } from './guard-shell.mjs'

const GUARD = fileURLToPath(new URL('./guard.mjs', import.meta.url))
const rule = (cmd, opts) => checkCommand(cmd, opts)?.name ?? null
const bg = (cmd) => rule(cmd, { background: true })

// A heredoc-fed commit message, the shape Claude Code writes by default.
const heredocCommit = (body) => `git add -A && git commit -m "$(cat <<'EOF'\n${body}\nEOF\n)"`

describe('guard-shell: the reader', () => {
  test('splits segments at && || ; | & and newlines', () => {
    const argv = parseShell('a 1 && b 2 || c; d | e & f\ng').segments.map((s) => s.argv[0])
    assert.deepEqual(argv, ['a', 'b', 'c', 'd', 'e', 'f', 'g'])
  })

  test('quotes make one word; backslashes escape; comments drop', () => {
    const [seg] = parseShell(`echo "a b" 'c d' e\\ f # g h`).segments
    assert.deepEqual(seg.argv, ['echo', 'a b', 'c d', 'e f'])
  })

  test('heredoc bodies leave argv and sit on the segment that opened them', () => {
    const { segments } = parseShell("cat > x.md <<'EOF'\ngit push --force\nEOF\nls")
    assert.deepEqual(segments.map((s) => s.argv), [['cat'], ['ls']])
    assert.deepEqual(segments[0].heredocs, ['git push --force\n'])
  })

  test('<<- strips leading tabs from the delimiter line; an unclosed heredoc runs to the end', () => {
    assert.deepEqual(parseShell('cat <<-EOF\n\tbody\n\tEOF\necho done').segments.map((s) => s.argv[0]), ['cat', 'echo'])
    assert.deepEqual(parseShell('cat <<EOF\nbody\nmore').segments[0].heredocs, ['body\nmore\n'])
  })

  test('redirection targets and fd numbers are not argv', () => {
    assert.deepEqual(parseShell('npm test 2>&1 >out.log <in.txt').segments[0].argv, ['npm', 'test'])
    assert.deepEqual(parseShell('cat <<< "git push -f"').segments[0].argv, ['cat'])
  })

  test('$(...), backticks, <(...), bash -c and eval are read as executed segments', () => {
    const runs = (cmd) => parseShell(cmd).segments.map((s) => s.argv.join(' '))
    assert.ok(runs('echo "$(git status)"').includes('git status'))
    assert.ok(runs('echo `git status`').includes('git status'))
    assert.ok(runs('diff <(git show a) b').includes('git show a'))
    assert.ok(runs("bash -lc 'git status'").includes('git status'))
    assert.ok(runs('eval git status').includes('git status'))
    assert.ok(runs('cat <<EOF\n$(git status)\nEOF').includes('git status'), 'unquoted heredoc body expands')
    assert.ok(!runs("cat <<'EOF'\n$(git status)\nEOF").includes('git status'), 'quoted heredoc body does not')
  })

  test('wrappers, assignments and git globals peel off', () => {
    const [seg] = parseShell('sudo -u bob env CI=1 timeout 60 git -C /x -c a=b push origin').segments
    assert.deepEqual(effectiveWords(seg).map((w) => w.text), ['git', '-C', '/x', '-c', 'a=b', 'push', 'origin'])
    assert.equal(gitCall(seg).sub, 'push')
  })

  test('parseOpts: clusters, attached values, long =values, --', () => {
    const ws = (s) => s.split(' ').map((text) => ({ text, quoted: false }))
    const o = parseOpts(ws('-am msg -Fx --author=me --message hi -- -n'), 'mF', ['message', 'author'])
    assert.ok(o.short.has('a') && o.short.has('m') && o.short.has('F') && !o.short.has('n'))
    assert.deepEqual(o.values.map((v) => [v.opt, v.value]), [['-m', 'msg'], ['-F', 'x'], ['--author', 'me'], ['--message', 'hi']])
    assert.deepEqual(o.positional.map((w) => w.text), ['-n'])
  })

  test('an unclosed quote throws (the guard then falls back to its legacy regexes)', () => {
    assert.throws(() => parseShell('echo "abc'))
    assert.throws(() => parseShell('echo $(abc'))
  })
})

describe('each rule still blocks its real target', () => {
  const cases = [
    ['git commit -m "x" --no-verify', 'no-verify'],
    ['git commit --no-verify -m "x"', 'no-verify'],
    ['git commit -n -m "x"', 'no-verify'],
    ['git commit -anm "x"', 'no-verify'],
    ['cd sub && git -C . commit --no-verify -m x', 'no-verify'],
    [heredocCommit('fix: x') + ' --no-verify', 'no-verify'],
    ['git push --force origin main', 'force-push'],
    ['git push -f', 'force-push'],
    ['git push --force-with-lease origin main', 'force-push'],
    ['git push --force-if-includes', 'force-push'],
    ['git push origin +main', 'force-push'],
    ['sudo git push -uf origin x', 'force-push'],
    ['echo "$(git push -f)"', 'force-push'],
    ["bash -c 'git push --force'", 'force-push'],
    ['cat <<EOF\n$(git push -f)\nEOF', 'force-push'],
    ['git reset --hard HEAD~3', 'destructive-reset'],
    ['git clean -fd', 'destructive-reset'],
    ['git clean -xdf', 'destructive-reset'],
    ['git checkout -- .', 'destructive-reset'],
    ['git checkout .', 'destructive-reset'],
    ['git branch -D main', 'destructive-reset'],
    ['git commit -F msg.txt', 'commit-message-from-file'],
    ['git commit --file=msg.txt', 'commit-message-from-file'],
    ['git commit -aF msg.txt', 'commit-message-from-file'],
    ["git commit -F - <<'EOF'\nfix: x\nEOF", 'commit-message-from-file'],
    ['pkill -f "http.server 8931"', 'pkill-self-match'],
    ['cd x && pkill -f wrangler; npm test', 'pkill-self-match'],
    ['pkill --full wrangler', 'pkill-self-match'],
    ['(sudo pkill -f vite)', 'pkill-self-match'],
    ['git commit -m "feat: x\n\nCo-Authored-By: bot"', 'trailer-or-emoji-in-commit'],
    ['git commit -m "feat: ship \u{1F680}"', 'trailer-or-emoji-in-commit'],
    ['git commit -m "x" -m "co-authored-by: bot"', 'trailer-or-emoji-in-commit'],
    ['git commit --trailer "Co-authored-by: bot" -m x', 'trailer-or-emoji-in-commit'],
    [heredocCommit('feat: x\n\nCo-Authored-By: bot <b@x>'), 'trailer-or-emoji-in-commit'],
    ['MSG="x\n\nCo-Authored-By: bot"; git commit -m "$MSG"', 'trailer-or-emoji-in-commit'],
  ]
  for (const [cmd, expected] of cases) {
    test(`${JSON.stringify(cmd).slice(0, 70)} → ${expected}`, () => assert.equal(rule(cmd), expected))
  }

  test('the backgrounded gate', () => {
    for (const cmd of [
      'npm test',
      'npm run verify',
      'npm run verify -w axiomancer-mobile',
      'npm run deploy:check',
      'npm run e2e:web',
      'cd x && CI=1 npm test',
      'node --test scripts/a.test.mjs',
      'node scripts/foo.test.mjs',
      'npx playwright test',
      'bash scripts/verify.sh',
      './scripts/verify.sh',
      'timeout 600 npm run verify',
      "bash -c 'npm test'",
    ]) {
      assert.equal(bg(cmd), 'backgrounded-gate', cmd)
      assert.equal(rule(cmd), null, `${cmd} in the foreground is fine`)
    }
  })

  test('a command the reader cannot parse falls back to the legacy regexes (fails closed)', () => {
    assert.equal(rule('git push --force "unclosed'), 'force-push')
    assert.equal(bg('npm test "unclosed'), 'backgrounded-gate')
  })
})

describe('formerly false positives are now allowed', () => {
  const allowed = [
    // a heredoc body is data
    "cat > notes.md <<'EOF'\nNever run git push --force or git commit --no-verify.\nEOF",
    'cat > notes.md <<EOF\ngit reset --hard is forbidden; so is pkill -f x\nEOF',
    "cat > plan/x.md <<'EOF'\nCo-Authored-By trailers are banned \u{1F680}\nEOF\ngit add plan/x.md && git commit -m \"plan: note\"",
    // a quoted -m message is a message, not flags
    'git commit -m "docs: say why --no-verify and git push --force stay denied"',
    'git commit -m "docs: git commit -F msg.txt is refused"',
    'git commit -m "docs: never git reset --hard or git clean -fd"',
    heredocCommit('docs: the guard denies --no-verify, -F and git push --force\n\nbody'),
    'git commit -m "guard refuses an unbracketed pkill -f now"',
    // text handed to another program
    'echo "git push --force"',
    'grep -rn "git push -f" .',
    'rg -- "--no-verify" skills/',
    'printf "%s\\n" "pkill -f x"',
    // content rule: the emoji / trailer is not in the commit message
    'node scripts/card.mjs --text "\u{1F525} burns" && git commit -m "content: card text"',
    'grep -rn "Co-Authored-By" .github && git commit -m "ci: check trailers"',
    // near misses on argv itself
    'git push origin main',
    'git push -u origin feature/force',
    'git branch -D main-old',
    'git checkout -b feature',
    'git clean -n',
    'git reset HEAD~1',
    'gh issue list -n 5',
    'git log -n 5',
    'pkill -f "[h]ttp.server 8931"',
    'pkill node',
  ]
  for (const cmd of allowed) {
    test(`allowed: ${JSON.stringify(cmd).slice(0, 80)}`, () => assert.equal(rule(cmd), null))
  }

  test('the backgrounded gate ignores the gate words in text and paths', () => {
    for (const cmd of [
      'git commit -m "add a test for verify"',
      heredocCommit('test: cover the e2e path'),
      'git add .claude/hooks/guard.test.mjs scripts/verify-notes.md',
      'cat docs/test-plan.md',
      'npm run dev',
      'npx wrangler dev --test-scheduled-off',
      "cat > x.md <<'EOF'\nrun npm test and npm run verify\nEOF",
      'sleep 30 && echo "e2e done"',
    ]) {
      assert.equal(bg(cmd), null, cmd)
    }
  })
})

describe('the hook end to end (stdin JSON → exit code)', () => {
  const run = (tool_input) =>
    spawnSync(process.execPath, [GUARD, 'pre-bash'], {
      input: JSON.stringify({ tool_input }),
      encoding: 'utf-8',
    })

  test('blocks with exit 2 and the rule message on stderr', () => {
    const r = run({ command: 'git push --force origin main' })
    assert.equal(r.status, 2)
    assert.match(r.stderr, /force-push is forbidden/)
    const b = run({ command: 'npm test', run_in_background: true })
    assert.equal(b.status, 2)
    assert.match(b.stderr, /never run the verify\/deploy gate in the background/)
  })

  test('allows with exit 0', () => {
    assert.equal(run({ command: heredocCommit('docs: why --no-verify stays denied') }).status, 0)
    assert.equal(run({ command: 'git commit -m "add test"', run_in_background: true }).status, 0)
    assert.equal(run({}).status, 0, 'no command, no opinion')
  })

  test('checkBash reads the same payload shape', () => {
    assert.equal(checkBash({ tool_input: { command: 'git reset --hard' } })?.name, 'destructive-reset')
    assert.equal(checkBash({ tool_input: { command: 'npm test', run_in_background: true } })?.name, 'backgrounded-gate')
    assert.equal(checkBash({}), null)
  })
})
