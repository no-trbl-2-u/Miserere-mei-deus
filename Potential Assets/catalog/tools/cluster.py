"""Cluster near-duplicate art, pair the systematic variants, and shard the rest.

The point is to pay for a description once per distinct image, not once per
file. Three collapses, cheapest first:
  1. exact pHash+dHash equality  -> same art under different names
     (COVERAGE.md's own example: `Ghost` and `RC18`);
  2. the `_nobg` / `X1` / `~2` suffix families -> a variant inherits its
     base's description;
  3. pHash Hamming distance <= 6 within an atlas -> same motif, recoloured.

Writes clusters.jsonl, vocabulary.json and shards/*.json.
"""
import json, io, os, re, math, collections

ASSETS = r"C:\Users\notrb\Workspace\Miserere-mei-deus\Potential Assets"
EXTRACT = os.path.join(ASSETS, "extract")
BUILD = os.path.join(ASSETS, "catalog", "derived")
CORPUS = r"C:\Users\notrb\Workspace\Playground\BuriedBornes-2\data\bgdb"

VARIANT = re.compile(r"^(?P<base>.+?)(?P<suffix>(_nobg|X\d+|~\d+)+)$")
NEAR = 6  # Hamming distance on a 64-bit pHash


def jsonl(path):
    with io.open(path, encoding="utf-8") as fh:
        for line in fh:
            if line.strip():
                yield json.loads(line)


def bits(hexstr):
    return int(hexstr, 16)


def main():
    base = {r["file"]: r for r in jsonl(os.path.join(BUILD, "base.jsonl"))}
    hashes = {r["file"]: r for r in jsonl(os.path.join(BUILD, "hashes.jsonl")) if "error" not in r}
    lic = {r["file"]: r for r in jsonl(os.path.join(BUILD, "per-file-license.jsonl"))}

    # --- 1. exact perceptual identity -------------------------------------
    exact = collections.defaultdict(list)
    for f, h in hashes.items():
        exact[(h["phash"], h["dhash"])].append(f)

    # --- 2. variant families ---------------------------------------------
    by_name = {r["name"]: f for f, r in base.items()}
    variant_of = {}
    for f, r in base.items():
        m = VARIANT.match(r["name"])
        if m and m.group("base") in by_name:
            parent = by_name[m.group("base")]
            if parent != f:
                variant_of[f] = parent

    # --- 3. near-duplicates inside an atlas ------------------------------
    groups = collections.defaultdict(list)
    for f, h in hashes.items():
        groups[base.get(f, {}).get("atlas") or base.get(f, {}).get("type")].append(f)
    parent = {f: f for f in hashes}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    for key, files in exact.items():
        for f in files[1:]:
            union(files[0], f)
    for child, par in variant_of.items():
        if child in parent and par in parent:
            union(par, child)
    for _key, files in groups.items():
        # bucket by the top 16 bits of the pHash so this stays near-linear
        buckets = collections.defaultdict(list)
        for f in files:
            buckets[hashes[f]["phash"][:4]].append(f)
        for bucket in buckets.values():
            vals = [(f, bits(hashes[f]["phash"])) for f in bucket]
            for i, (fa, ha) in enumerate(vals):
                for fb, hb in vals[i + 1:]:
                    if bin(ha ^ hb).count("1") <= NEAR:
                        union(fa, fb)

    members = collections.defaultdict(list)
    for f in hashes:
        members[find(f)].append(f)

    # A cluster's representative is the member with a corpus row if any has
    # one (the game's own label beats a guess), else the largest file.
    clusters = []
    for root, mem in members.items():
        mem.sort()
        withrow = [f for f in mem if base.get(f, {}).get("corpus")]
        rep = withrow[0] if withrow else max(mem, key=lambda f: base.get(f, {}).get("bytes") or 0)
        clusters.append({
            "cluster_id": "c%05d" % len(clusters),
            "representative": rep,
            "members": mem,
            "size": len(mem),
            "has_corpus_row": bool(withrow),
            "atlas": base.get(rep, {}).get("atlas"),
            "type": base.get(rep, {}).get("type"),
        })
    clusters.sort(key=lambda c: (-c["size"], c["representative"]))
    for i, c in enumerate(clusters):
        c["cluster_id"] = "c%05d" % i

    with io.open(os.path.join(BUILD, "clusters.jsonl"), "w", encoding="utf-8", newline="\n") as fh:
        for c in clusters:
            fh.write(json.dumps(c, ensure_ascii=False) + "\n")

    # --- closed tag vocabulary, grounded in the game's own Category values -
    cats = collections.Counter()
    for fn in ("skill.json", "campitem.json", "rune.json", "state.json", "gear.json"):
        p = os.path.join(CORPUS, fn)
        if not os.path.exists(p):
            continue
        for row in json.load(io.open(p, encoding="utf-8")):
            c = row.get("Category")
            if isinstance(c, str) and c:
                cats[c] += 1

    need_vision = [c for c in clusters if not c["has_corpus_row"]]
    summary = {
        "png_files": len(hashes),
        "clusters": len(clusters),
        "clusters_with_corpus_row": sum(1 for c in clusters if c["has_corpus_row"]),
        "clusters_needing_vision": len(need_vision),
        "collapse_ratio": round(len(hashes) / max(len(clusters), 1), 2),
        "variant_children": len(variant_of),
        "exact_perceptual_groups": sum(1 for v in exact.values() if len(v) > 1),
        "corpus_categories": dict(cats.most_common(40)),
    }
    with io.open(os.path.join(BUILD, "cluster-summary.json"), "w", encoding="utf-8", newline="\n") as fh:
        json.dump(summary, fh, ensure_ascii=False, indent=1)
    print(json.dumps({k: v for k, v in summary.items() if k != "corpus_categories"}, indent=1))
    print("corpus Category values:", json.dumps(summary["corpus_categories"], ensure_ascii=False)[:900])


if __name__ == "__main__":
    main()
