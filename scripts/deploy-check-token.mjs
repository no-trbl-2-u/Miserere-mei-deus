// The github-actions deploy gate's token lookup: GH_TOKEN (the repo-scoped
// PAT in .env), then GITHUB_TOKEN, then GH_PAT, so a remote web session that
// has only one of the latter two can still run `npm run deploy:check`.
export function resolveGithubToken(env = process.env) {
  for (const name of ['GH_TOKEN', 'GITHUB_TOKEN', 'GH_PAT']) {
    const v = env[name]
    if (typeof v === 'string' && v.trim() !== '') return v.trim()
  }
  return undefined
}
