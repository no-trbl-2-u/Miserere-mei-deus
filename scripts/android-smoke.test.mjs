// Pins .github/workflows/android-smoke.yml and its Maestro flow (spec 125,
// phase LG1i, A9): both parse as YAML; the workflow is manual only, takes an
// optional EAS build id, builds a fresh preview APK only when none is given,
// keeps EXPO_TOKEN on the steps that use it, boots a KVM emulator from a
// pinned action, and uploads the run's shots and log even on a failure; the
// flow reaches the title and ends one combat round.

import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import test from 'node:test'
import yaml from 'js-yaml'

const root = new URL('../', import.meta.url)
const read = (p) => readFileSync(new URL(p, root), 'utf8').replace(/\r\n/g, '\n')
const workflow = yaml.load(read('.github/workflows/android-smoke.yml'))
// A Maestro flow is two YAML documents: the config, then the command list.
const [config, commands] = yaml.loadAll(read('axiomancer-mobile/.maestro/android-smoke.yaml'))
const job = workflow.jobs.smoke
const step = (name) => {
  const found = job.steps.find((s) => s.name === name)
  assert.ok(found, `the smoke job has a step named "${name}"`)
  return found
}

test('it runs only by hand, with an optional build id', () => {
  // js-yaml reads the bare `on` key as the string "on" (YAML 1.2 core schema).
  assert.deepEqual(Object.keys(workflow.on), ['workflow_dispatch'])
  const input = workflow.on.workflow_dispatch.inputs.build_id
  assert.equal(input.required, false)
  assert.equal(input.default, '')
  assert.deepEqual(workflow.permissions, { contents: 'read' })
})

test('a fresh EAS build runs only when no build id is given', () => {
  const fresh = step('Build a fresh preview APK')
  assert.equal(fresh.if, "env.SMOKE_BUILD_ID == ''")
  assert.match(fresh.run, /eas-cli@latest build --platform android --profile preview --non-interactive --wait/)
  assert.equal(step('Install workspace dependencies').if, "env.SMOKE_BUILD_ID == ''")
})

test('EXPO_TOKEN reaches only the build and the lookup', () => {
  const holders = job.steps.filter((s) => JSON.stringify(s).includes('secrets.EXPO_TOKEN')).map((s) => s.name)
  assert.deepEqual(holders, ['Build a fresh preview APK', 'Resolve the APK'])
  assert.ok(!JSON.stringify(job.env ?? {}).includes('secrets.'), 'no secret in the job env')
})

test('the lookup refuses anything but a finished Android APK', () => {
  const run = step('Resolve the APK').run
  assert.match(run, /api\.expo\.dev\/graphql/)
  assert.match(run, /"\$status" != "FINISHED"/)
  assert.match(run, /"\$platform" != "ANDROID"/)
})

test('the emulator runs on KVM from a pinned action, and the run is uploaded on a failure', () => {
  assert.equal(job['runs-on'], 'ubuntu-latest')
  assert.match(step('Enable KVM').run, /99-kvm4all\.rules/)
  const emu = step('Run the smoke flow on an emulator')
  assert.match(emu.uses, /^ReactiveCircus\/android-emulator-runner@[0-9a-f]{40}$/)
  assert.equal(emu.with.arch, 'x86_64')
  assert.match(emu.with.script, /^bash axiomancer-mobile\/\.maestro\/run-android-smoke\.sh /)
  assert.ok(!emu.with.script.includes('\n'), 'one line: the action runs each script line on its own')
  const upload = step('Upload the screenshots and the flow log')
  assert.equal(upload.if, 'always()')
  assert.match(upload.uses, /^actions\/upload-artifact@/)
})

test('the run script is executable and keeps the log and a failure screenshot', () => {
  const p = new URL('axiomancer-mobile/.maestro/run-android-smoke.sh', root)
  assert.ok(existsSync(p))
  assert.ok(statSync(p).mode & 0o100, 'run-android-smoke.sh is executable')
  const sh = readFileSync(p, 'utf8')
  assert.match(sh, /maestro\.log/)
  assert.match(sh, /screencap -p > "\$out\/failure\.png"/)
})

test('the flow targets the app, reaches the title and ends one combat round', () => {
  assert.equal(config.appId, 'com.axiomancer.mobile')
  assert.ok(Array.isArray(commands))
  const text = JSON.stringify(commands)
  for (const id of ['title-screen', 'title-embark', 'main-menu-settings', 'settings-dev-tools-link',
    'debug-trigger-encounter-encounter', 'combat-enter', 'combat-board', 'combat-end-phase']) {
    assert.ok(text.includes(`"${id}"`), `the flow names ${id}`)
  }
  const end = commands.findIndex((c) => c.tapOn?.id === 'combat-end-phase')
  assert.ok(end > 0, 'the flow taps END')
  const after = commands.slice(end + 1)
  assert.ok(after.some((c) => c.extendedWaitUntil?.visible?.id === 'combat-end-phase'
    && c.extendedWaitUntil.visible.enabled === true && !c.extendedWaitUntil.optional),
  'after END, the flow waits for the next phase to go live')
  assert.ok(after.some((c) => typeof c.takeScreenshot === 'string'), 'a pass screenshot after the round')
})
