"""Join the extracted asset manifest to Buriedbornes 2's own decoded tables.

Ground truth first: for every asset the corpus names in an Icon/Image column,
the game itself supplies the label (row name, Desc, Category, Rarity, Tag,
audio cue). Nothing here infers anything. Assets with no corpus row are
emitted with corpus=[] and are the only ones a vision pass has to look at.

Writes catalog/derived/base.jsonl (one record per extracted file).
"""
import json, io, os, re, sys, collections

ASSETS = r"C:\Users\notrb\Workspace\Miserere-mei-deus\Potential Assets"
EXTRACT = os.path.join(ASSETS, "extract")
CORPUS = r"C:\Users\notrb\Workspace\Playground\BuriedBornes-2\data\bgdb"
OUT = os.path.join(ASSETS, "catalog", "derived")

# COVERAGE.md -> "Columns named Icon/Image that are not asset references".
NOT_ASSET_REFS = {("iap", "Image"), ("lparts", "Icon"), ("shop", "Icon"), ("span", "Image")}
REF_COL = re.compile(r"^(icon|image)\d*$", re.I)
# Fields worth carrying from a corpus row, when the row has them.
CARRY = ("name", "ID", "Desc", "Category", "Rarity", "Tag", "audio", "ShortText", "ParamKey")


def jload(path):
    with io.open(path, encoding="utf-8") as fh:
        return json.load(fh)


def main():
    manifest = jload(os.path.join(EXTRACT, "_manifest.json"))
    index = jload(os.path.join(EXTRACT, "_index.json"))          # lower(name) -> path
    by_path = {a["file"]: a for a in manifest["assets"]}

    refs = collections.defaultdict(list)                          # path -> [ref, ...]
    unresolved = collections.Counter()
    tables = 0
    for fn in sorted(os.listdir(CORPUS)):
        if not fn.endswith(".json") or fn == "_schema.json":
            continue
        table = fn[:-5]
        rows = jload(os.path.join(CORPUS, fn))
        if not isinstance(rows, list) or not rows:
            continue
        cols = [c for c in rows[0] if REF_COL.match(c) and (table, c) not in NOT_ASSET_REFS]
        if not cols:
            continue
        tables += 1
        for row in rows:
            for col in cols:
                val = row.get(col)
                if not isinstance(val, str) or not val.strip():
                    continue
                path = index.get(val.lower())
                if path is None:
                    unresolved[(table, col, val)] += 1
                    continue
                refs[path].append({
                    "table": table, "column": col,
                    "row": {k: row[k] for k in CARRY if k in row and row[k] not in ("", [], None)},
                })

    os.makedirs(OUT, exist_ok=True)
    kept = 0
    with io.open(os.path.join(OUT, "base.jsonl"), "w", encoding="utf-8", newline="\n") as fh:
        for a in manifest["assets"]:
            rec = {
                "name": a["name"], "file": a["file"], "type": a["type"],
                "width": a.get("width"), "height": a.get("height"), "bytes": a["bytes"],
                "atlas": a.get("atlas"), "from_atlas": a.get("from_atlas", False),
                "copies": a.get("copies"), "container": a["container"],
                "audio_asset": a.get("audio"),
                "corpus": refs.get(a["file"], []),
            }
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
            kept += 1

    covered = sum(1 for a in manifest["assets"] if refs.get(a["file"]))
    summary = {
        "files": kept,
        "corpus_tables_with_asset_refs": tables,
        "files_with_corpus_row": covered,
        "files_without_corpus_row": kept - covered,
        "distinct_unresolved_names": len({v for _, _, v in unresolved}),
        "unresolved_examples": [
            {"table": t, "column": c, "value": v, "refs": n}
            for (t, c, v), n in unresolved.most_common(10)
        ],
    }
    with io.open(os.path.join(OUT, "join-summary.json"), "w", encoding="utf-8", newline="\n") as fh:
        json.dump(summary, fh, ensure_ascii=False, indent=1)
    print(json.dumps(summary, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
