import fs from 'node:fs'
const patch = (file, pairs) => {
  let s = fs.readFileSync(file, 'utf8')
  for (const [from, to] of pairs) {
    if (!s.includes(from)) throw new Error(`${file}: missing ${from.slice(0, 70)}`)
    s = s.replace(from, to)
  }
  fs.writeFileSync(file, s)
}

patch('.github/workflows/pr-review.yml', [
  // 2. the review job runs main's partition and review scripts too
  [`        for p in skills/review.md .claude CLAUDE.md AGENTS.md .mcp.json; do`,
   `        for p in skills/review.md scripts/pr-partition.mjs scripts/pr-review.mjs scripts/pr-risk.mjs .claude CLAUDE.md AGENTS.md .mcp.json; do`],
  [`      # The PR's head may edit skills/review.md or .claude/; the reviewer
      # runs main's copies of both when main has them.`,
   `      # The PR's head may edit skills/review.md, the partition or the
      # reviewer's scripts, or .claude/; the reviewer runs main's copies of
      # all of them when main has them.`],
  // 3. actions: read; 1. checkout main, never the PR's scripts
  [`    permissions:
      contents: write
      pull-requests: write
    concurrency:
      group: pr-merge-\${{ needs.review-wanted.outputs.pr }}`,
   `    permissions:
      contents: write
      pull-requests: write
      actions: read
    concurrency:
      group: pr-merge-\${{ needs.review-wanted.outputs.pr }}`],
  [`    steps:
      - uses: actions/checkout@v4
        with:
          sparse-checkout: scripts
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: When this run's review started`,
   `    steps:
      # main's scripts, never the PR's: a PR could otherwise rewrite the
      # decision that merges it.
      - uses: actions/checkout@v4
        with:
          ref: main
          sparse-checkout: scripts
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: When this run's review started`],
  // 4. merge first, audit after; 6. the Hold echo is a block scalar (a plain-scalar " #" is a YAML comment)
  [`      - name: Audit comment, then auto-merge (GitHub's ruleset decides)
        if: steps.decide.outputs.go == 'true'
        run: |
          gh pr comment "$PR" --repo "$GH_REPO" --body "$(node scripts/pr-merge.mjs audit --pr "$PR" --head "$HEAD_SHA" --run "$GITHUB_RUN_ID")"
          gh pr merge "$PR" --repo "$GH_REPO" --auto --merge --match-head-commit "$HEAD_SHA"
      - name: Hold
        if: steps.decide.outputs.go != 'true'
        env:
          REASON: \${{ steps.decide.outputs.reason }}
        run: echo "::notice::PR #$PR not merged: $REASON"`,
   `      - name: Auto-merge (GitHub's ruleset decides), then the audit comment
        if: steps.decide.outputs.go == 'true'
        run: |
          gh pr merge "$PR" --repo "$GH_REPO" --auto --merge --match-head-commit "$HEAD_SHA"
          gh pr comment "$PR" --repo "$GH_REPO" --body "$(node scripts/pr-merge.mjs audit --pr "$PR" --head "$HEAD_SHA" --run "$GITHUB_RUN_ID")"
      - name: Hold
        if: steps.decide.outputs.go != 'true'
        env:
          REASON: \${{ steps.decide.outputs.reason }}
        run: |
          echo "::notice::PR $PR not merged: $REASON"`],
])

patch('scripts/pr-merge.mjs', [
  [`  return [
    \`Auto-merged by the \\\`pr-review\\\` merge job (D95): review verdict \\\`pass\\\` on head \\\`\${head}\\\`, run \${run}.\`,
    AUTO_MARKER,
  ].join('\\n')`,
   `  return [
    \`Merge requested by the \\\`pr-review\\\` merge job (D95): review verdict \\\`pass\\\` on head \\\`\${head}\\\`, run \${run}; GitHub's ruleset performs the merge.\`,
    AUTO_MARKER,
  ].join('\\n')`],
  [`// \`main\` reads GitHub.`, `// \`main\` reads GitHub. The merge job checks out \`main\`'s copy of this file,
// so a PR cannot rewrite the decision that merges it.`],
])

patch('scripts/loop-pr.test.mjs', [
  [`    if (f !== 'pr-review.yml') {
      assert.doesNotMatch(text, /gh pr merge/, f)
      assert.doesNotMatch(text, /--auto\\b/, f)
    }`,
   `    if (f !== 'pr-review.yml') {
      assert.doesNotMatch(text, /gh pr merge/, f)
      assert.doesNotMatch(text, /--auto\\b/, f)
    } else {
      // Outside the merge job, pr-review.yml merges nothing either.
      const outside = text.replace(/\\n {2}merge:\\n[\\s\\S]*$/, '')
      assert.doesNotMatch(outside, /gh pr merge|--auto\\b/, 'pr-review.yml merges only in its merge job')
    }`],
  [`  assert.match(code(s), /gh pr comment "\\$PR"[^\\n]*pr-merge\\.mjs audit/, 'the audit comment goes first')`,
   `  assert.match(code(s), /gh pr merge[^\\n]*\\n[^\\n]*gh pr comment "\\$PR"[^\\n]*pr-merge\\.mjs audit/, 'the audit comment follows the merge call, never precedes it')
  assert.match(mj, /- uses: actions\\/checkout@v4\\n\\s+with:\\n\\s+ref: main\\n\\s+sparse-checkout: scripts/, 'the merge job runs main\\'s scripts, never the PR\\'s')
  assert.match(mj, /^ {6}actions: read$/m)`],
  [`  assert.match(rv, /for p in skills\\/review\\.md \\.claude CLAUDE\\.md AGENTS\\.md \\.mcp\\.json; do/)`,
   `  assert.match(rv, /for p in skills\\/review\\.md scripts\\/pr-partition\\.mjs scripts\\/pr-review\\.mjs scripts\\/pr-risk\\.mjs \\.claude CLAUDE\\.md AGENTS\\.md \\.mcp\\.json; do/)`],
])

patch('scripts/pr-merge.test.mjs', [
  [`  assert.match(c, /D95/)`, `  assert.match(c, /D95/)
  assert.match(c, /Merge requested/, 'the comment follows the merge call and claims no outcome of its own')`],
])

patch('skills/review.md', [
  [`so a PR cannot rewrite the instructions it is reviewed by.`, `so a PR cannot rewrite the instructions it is reviewed by; the same
goes for \`scripts/pr-partition.mjs\`, \`scripts/pr-review.mjs\` and
\`scripts/pr-risk.mjs\`.`],
])
console.log('ok')
