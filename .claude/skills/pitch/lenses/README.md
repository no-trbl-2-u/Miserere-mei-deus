# Lenses

A lens is what a specialist would do in the chair: which questions they
ask first, what evidence they refuse to proceed without, where they look
for prior art, and what they will not pitch. It is loaded into the main
conversation; it is never a subagent, because a subagent cannot talk to
T.

File: `lenses/<name>.md`. Select with `/pitch --as <name>` or the repo
config `lens:`. Shape, every section required:

```markdown
# Lens: <name>
One paragraph: whose checklist this is built from.

## First questions: converge     (3 to 6; the opener picks at most 3)
## First questions: diverge      (3 to 6)
## Evidence demanded before ready (what must be in EVIDENCE, and from where)
## Prior art sources              (where the lens looks, in order)
## Exit extras                    (fields added to the pitch file)
## Refuses                        (what this lens will not pitch)
```

Keep each lens under 80 lines. The general lens is section 3 of
`references.md` with no extras.

Shipped: `game-design.md`, `ai-harness.md`, `qa.md`.
