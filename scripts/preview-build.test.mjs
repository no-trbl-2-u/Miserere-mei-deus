// Pins the TestFlight path of .github/workflows/preview-build.yml (phase IO1c):
// the `submit` input, that a submit is the iOS beta build only, that the App
// Store Connect key reaches only the step that writes it and fails naming a
// missing secret or a placeholder app id, that `--auto-submit` runs only
// behind `submit`, and that the beta and production profiles never get the
// puzzle API values, so a friend's build posts no play data.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const workflow = readFileSync(new URL('.github/workflows/preview-build.yml', root), 'utf8').replace(/\r\n/g, '\n')
const eas = JSON.parse(readFileSync(new URL('axiomancer-mobile/eas.json', root), 'utf8'))

const SECRET_REF = /\$\{\{\s*secrets\.(\w+)\s*\}\}/g
const ASC_SECRETS = ['ASC_API_ISSUER_ID', 'ASC_API_KEY_ID', 'ASC_API_KEY_P8']

/** The text before `steps:` (triggers, job header) and one block per step, keyed by its name. */
function parse(text) {
  const at = text.indexOf('\n    steps:\n')
  assert.ok(at > 0, 'the build job has a steps list')
  const head = text.slice(0, at)
  const steps = text
    .slice(at)
    .split(/\n(?=      - name: )/)
    .slice(1)
    .map((block) => ({ name: block.match(/^      - name: (.+)$/m)[1].trim(), block }))
  return { head, steps }
}

const { head, steps } = parse(workflow)
const step = (pattern) => {
  const found = steps.filter((s) => pattern.test(s.block))
  assert.equal(found.length, 1, `exactly one step matches ${pattern}`)
  return found[0]
}
const indexOf = (s) => steps.indexOf(s)
const secretsIn = (text) => [...text.matchAll(SECRET_REF)].map((m) => m[1]).sort()
const condition = (s) => s.block.match(/^        if: (.+)$/m)?.[1]

test('it offers a `submit` boolean input, off by default, and stays dispatch-only', () => {
  assert.match(head, /\n      submit:\n        description: .+\n        required: false\n        default: false\n        type: boolean\n/)
  assert.match(head, /\n  workflow_dispatch:\n/)
  assert.doesNotMatch(head, /\n  (push|pull_request|schedule):/, 'builds run only by attended dispatch')
})

test('a submit is refused unless the platform is ios and the profile is beta, before the verify gate', () => {
  const check = step(/submit needs platform ios and profile beta/)
  assert.equal(condition(check), 'inputs.submit == true')
  assert.match(check.block, /"\$PREVIEW_PLATFORM" != "ios"/)
  assert.match(check.block, /"\$PREVIEW_PROFILE" != "beta"/)
  assert.match(check.block, /exit 1/)
  assert.ok(indexOf(check) < indexOf(step(/run: npm run verify --workspace axiomancer-mobile/)))
})

test('the App Store Connect key secrets reach only the key-file step', () => {
  const keyStep = step(/ASC_API_KEY_P8: \$\{\{ secrets\.ASC_API_KEY_P8 \}\}/)
  assert.deepEqual(secretsIn(keyStep.block), ASC_SECRETS)
  for (const other of steps.filter((s) => s !== keyStep)) {
    for (const name of ASC_SECRETS) assert.ok(!secretsIn(other.block).includes(name), `${other.name} never sees ${name}`)
  }
  assert.deepEqual(secretsIn(head), [], 'no secret is set at workflow or job level')
})

test('the key-file step runs only on submit and fails naming each missing secret', () => {
  const keyStep = step(/ASC_API_KEY_P8: \$\{\{ secrets\.ASC_API_KEY_P8 \}\}/)
  assert.equal(condition(keyStep), 'inputs.submit == true')
  assert.match(keyStep.block, /for name in ASC_API_KEY_P8 ASC_API_KEY_ID ASC_API_ISSUER_ID; do/)
  assert.match(keyStep.block, /if \[ -z "\$\{!name\}" \]; then\n\s+echo "::error::the repo secret \$name is not set/)
  assert.match(keyStep.block, /\[ "\$missing" = 0 \] \|\| exit 1/)
})

test('a submit fails while eas.json still holds the placeholder app id', () => {
  const keyStep = step(/ASC_API_KEY_P8: \$\{\{ secrets\.ASC_API_KEY_P8 \}\}/)
  assert.match(keyStep.block, /if ! jq -e '\.submit\.beta\.ios\.ascAppId \| test\("\^\[0-9\]\+\$"\)' eas\.json > \/dev\/null; then\n\s+echo "::error::.+ascAppId.+"\n\s+exit 1/)
})

test('the key goes to a temp file outside the checkout, and the beta submit profile points at it', () => {
  const keyStep = step(/ASC_API_KEY_P8: \$\{\{ secrets\.ASC_API_KEY_P8 \}\}/)
  assert.match(keyStep.block, /key="\$RUNNER_TEMP\/asc-api-key\.p8"/)
  assert.match(keyStep.block, /chmod 600 "\$key"/)
  assert.match(keyStep.block, /'\.submit\.beta\.ios \+= \{\n\s+ascApiKeyPath: \$path,\n\s+ascApiKeyId: env\.ASC_API_KEY_ID,\n\s+ascApiKeyIssuerId: env\.ASC_API_ISSUER_ID \}'/)
  assert.ok(eas.submit?.beta?.ios, 'eas.json has the submit.beta.ios block the step extends')
  assert.equal(eas.submit.beta.ios.ascApiKeyPath, undefined, 'the committed eas.json names no key file')
})

test('--auto-submit appears only in the EAS build step, only behind submit, after the key is written', () => {
  const build = step(/npx eas-cli@latest build /)
  assert.equal(workflow.match(/--auto-submit/g).length, 1, 'one --auto-submit in the workflow')
  assert.match(build.block, /submit_flag=\(\)\n\s+if \[ "\$PREVIEW_SUBMIT" = "true" \]; then\n\s+submit_flag=\(--auto-submit\)\n\s+fi\n/)
  assert.match(build.block, /--non-interactive "\$\{submit_flag\[@\]\}"/)
  assert.match(head, /\n      PREVIEW_SUBMIT: \$\{\{ inputs\.submit == true \}\}$/m)
  assert.deepEqual(secretsIn(build.block), ['EXPO_TOKEN'])
  assert.ok(indexOf(step(/ASC_API_KEY_P8: \$\{\{ secrets\.ASC_API_KEY_P8 \}\}/)) < indexOf(build))
})

test('the puzzle API values skip the beta and production profiles', () => {
  const puzzle = step(/EXPO_PUBLIC_PUZZLE_API_URL: \$\{\{ secrets\.EXPO_PUBLIC_PUZZLE_API_URL \}\}/)
  assert.equal(condition(puzzle), "env.PREVIEW_PROFILE != 'production' && env.PREVIEW_PROFILE != 'beta'")
  assert.ok(indexOf(puzzle) < indexOf(step(/npx eas-cli@latest build /)))
})
