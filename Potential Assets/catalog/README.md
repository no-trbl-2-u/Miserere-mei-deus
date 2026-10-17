# Asset catalog

A catalog over `Potential Assets/extract/` (8,697 files cut out of a local
Buriedbornes 2 install) and `Potential Assets/icons-TBR/` (4,180 game-icons.net
SVGs). Rebuild it with the scripts in `tools/`, in this order:

```bash
python tools/build_base.py    # join the game's own tables to the extracted files
python tools/hash_images.py   # pHash + pixel stats for every PNG
python tools/licensing.py     # Copy / Open, from provenance and font metadata
python tools/cluster.py       # collapse near-duplicates into clusters
python tools/batches.py       # split the table-covered clusters for translation
python tools/sheets.py        # contact sheets for the clusters no table covers
python tools/heldout.py       # the blind accuracy gate
# ... agent passes write into derived/labels/{translate,vision,heldout}/ ...
python tools/score_heldout.py # score the gate
python tools/assemble.py      # catalog.jsonl + Copy/ + Open/ + validation.json
```

## Where the labels come from

**The game's own database first.** `Workspace/Playground/BuriedBornes-2/data/bgdb/`
holds 89 decoded tables. 38 of them carry `Icon`/`Image` columns naming an
asset, and those rows already state what the asset is — its Japanese name,
`Desc`, `Category`, `Rarity`, `Tag` and audio cue. 2,307 of the 6,361 clusters
resolve to such a row, and for those the catalog is a translation of the game's
own record, not a guess. `source` reads `corpus:<table>.<column>` and the raw
rows are kept in the record's `corpus` field so any label can be traced back.

**Vision only for the remainder.** 4,054 clusters — UI chrome, backdrops,
effect textures — appear in no table. They were labelled from 163 contact
sheets of 25 assets each, with the asset's real name and true pixel size
alongside. `source` reads `vision`.

**Fonts and audio** carry `source: manifest`: their kind is known from the
Unity type and needs no inference.

## Why clusters

Describing 8,595 PNGs one at a time would pay repeatedly for the same art. The
manifest had already collapsed 14,940 byte-identical copies; on top of that
this pipeline collapses exact perceptual matches (`Ghost` and `RC18` are the
same image under two names), the systematic `_nobg` / `X1` / `~2` variant
families (982 children), and near-duplicates within an atlas at pHash Hamming
distance <= 6. 8,595 files become 6,361 clusters; one description covers a
cluster, and every member carries it with `is_cluster_representative` marking
which file was actually looked at.

## Copy vs Open

Decided by provenance and by file metadata, never per-image judgement.

| | files | basis |
|---|--:|---|
| `Copy/` | 8,921 | every file under `extract/` came out of one Steam install (`_manifest.json` → `game_dir`); the game's own art, not redistributable |
| `Open/` | 5 | the fonts that state a redistributable licence in their own name table: `LiberationSans`, `NotoSansSC`, `NotoSansTC`, `NotoSansKR`, `SourceCodePro` — all SIL OFL 1.1 |
| `icons-TBR/` | 4,180 | CC-BY-3.0 (CC0 for Viscious Speed and Zeromancer), per `license.txt`; 36 named contributors |

Two things the two-bucket split does **not** capture, recorded in the `license`
field rather than forced into a bucket:

- **31 payment-brand marks** (ApplePay, GooglePay, Stripe, Coda, each in its
  own atlas) are third-party **trademarks**. A trademark is not "open" and is
  more restricted than ordinary copyright, so neither bucket describes it.
- **7 fonts state no licence at all** (`ARIAL`, `Dimkin`, `PixelMplus12`, the
  four `Orbitron` weights). Orbitron and M+ are OFL upstream, but the *shipped*
  file carries no licence text, so the catalog says what the file says and
  classifies them `Copy`. Resolving them means going to the upstream project,
  not to the extracted copy.

`extract/` itself must not be pushed to a public remote; `COVERAGE.md`'s own
header says so, and nothing in this catalog changes that.

## Filenames are not renamed, on purpose

`_index.json` exists because the game's names are load-bearing and
inconsistent: 501 names contain spaces, both `icon-JB01` and `icon_Gargoyle`
separators ship, and 133 names collide across types. Renaming the extracted
files would break the index and with it the 100% corpus resolution
`COVERAGE.md` reports. The readable name lives in the catalog's `slug` field
beside the true `name` (the Unity `m_Name`, verbatim); the files on disk are
untouched.

## `used_by` is empty, and that is checked

No extracted Buriedbornes 2 asset is referenced anywhere in the Miserere
codebase, so every `used_by` is `[]`. `assemble.py` fails the build if a label
claims otherwise and the path does not resolve.

`icons-TBR` is the opposite case and is **already in use**:
`axiomancer-mobile/components/icons/game-icon-paths.ts` embeds 52 of those
icons with `<artist>/<icon>` attribution, and several
`assets/images/*/provenance.json` records cite the trove directly. The field
names and vocabulary here follow that existing convention (`license`,
`license_note`, `used_by`, `source`, `artist`, `attribution`).

## Record shape

```json
{
  "name": "Warriorskill_13",        // Unity m_Name, verbatim
  "slug": "slash-skill-icon",       // readable, kebab-case
  "file": "sprites/Warriorskill_13.png",
  "description": "...",             // one sentence
  "tags": {"kind": "...", "use": ["..."], "style": ["..."]},
  "used_by": [],
  "license": "...",
  "bucket": "Copy",
  "source": "corpus:skill.Icon",
  "confidence": "high",
  "cluster_id": "c01234",
  "is_cluster_representative": true,
  "corpus": [ /* the game's own rows, verbatim */ ],
  "type": "Sprite", "width": 64, "height": 64, "bytes": 5222,
  "atlas": "IconAtlasCat3", "copies_in_game": 3, "phash": "..."
}
```

`tags` are drawn from the closed vocabulary in `vocabulary.json`; anything
outside it fails validation.

## What says this is right

`derived/heldout-score.json` is the gate. 200 clusters the game's tables *do*
describe were rendered into sheets with the row withheld, labelled blind by the
same model and prompt as the real vision pass, and then scored by set
comparison against the withheld rows — a fixed table maps each game `Category`
onto the vocabulary, so no model grades itself. The resulting kind- and
use-accuracy, broken out by the confidence the labeller claimed, is the honest
confidence to attach to the 4,054 vision-only descriptions.

`derived/validation.json` holds the structural gate: every file on disk appearing
exactly once, every tag inside the vocabulary, every `_index.json` entry still
resolving, every non-empty `used_by` pointing at a real path. It carries a
single `PASS` boolean.

### Results of the run on 2026-10-17

8,926 records. `PASS: true` — 0 files missing, 0 duplicated, 0 tag violations,
0 unlabelled clusters, 0 dangling `used_by`, all 8,557 `_index.json` entries
resolving, 12,570 corpus references carried through.

| source | records |
|---|--:|
| `vision` | 4,745 |
| `corpus:<table>.<column>` | 3,850 |
| `filesystem` (UI layout JSON, see below) | 230 |
| `manifest` (12 fonts, 89 audio banks) | 101 |

Confidence as claimed by the labeller: 6,204 high, 2,574 medium, 148 low.

**Blind gate.** 200 clusters whose game rows were withheld scored **87%
kind-accuracy** and 62% use-accuracy. Kind-accuracy is the number to trust: it
asks whether the labeller identified *what the asset is*, which is the same
question the game's table answers. Use-accuracy compares two different axes —
the labeller tags apparent function, the table records which subsystem consumes
the asset — so a skill icon that a rune or state row reuses makes them disagree
without either being wrong. The `single_table` / `shared_icon` split in
`derived/heldout-score.json` was added to test whether shared icons explain the
gap; **they do not** (single-table clusters score *lower* on use, 0.578 vs
0.670), so the figure reflects that axis mismatch rather than duplicate reuse.
Low-confidence marks are honest: use-accuracy drops to 0.308 there, so the
labeller does know when it is guessing.

### Three defects found in the upstream extraction

Recorded rather than smoothed over; all three are in
`Playground/BuriedBornes-2/tools/extract_assets.py` territory, not in this
catalog.

1. **`_manifest.json` omits `extract/ui/` entirely.** 230 Unity prefab and
   PlayMaker-FSM JSON dumps sit on disk with no entry in `assets[]`, so any
   manifest-driven consumer silently misses them. They enter this catalog from
   the filesystem with `source: "filesystem"` and `type: "UILayoutJson"`.
2. **`sprites/Circle~2.png` is listed in the manifest but is not on disk.**
   A file that does not exist cannot be catalogued; it is reported in
   `validation.json` → `manifest_phantoms`.
3. **`sprites/_.png`** is a real file whose asset name sanitised away to
   nothing — a name-collision edge the extractor's `_` substitution does not
   guard.

`COVERAGE.md` also documents two unresolved corpus values (`シーズン1`); the
join found a third it does not list, a `<roamer>` placeholder in
`revent_node.Image`.
