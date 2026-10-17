"""Split the corpus-covered clusters into translation batches.

These assets need no vision: Buriedbornes 2's own row already says what each
one is. What they need is Japanese -> English, and the game's Category /
Rarity / Tag / audio fields mapped onto the closed vocabulary. Text only, so
these batches are cheap and go to the smallest capable model.
"""
import json, io, os, math

BUILD = r"C:\Users\notrb\Workspace\Miserere-mei-deus\Potential Assets\catalog\derived"
PER = 100


def jsonl(p):
    with io.open(p, encoding="utf-8") as fh:
        for line in fh:
            if line.strip():
                yield json.loads(line)


def main():
    base = {r["file"]: r for r in jsonl(os.path.join(BUILD, "base.jsonl"))}
    covered = [c for c in jsonl(os.path.join(BUILD, "clusters.jsonl")) if c["has_corpus_row"]]
    covered.sort(key=lambda c: c["representative"])
    out = os.path.join(BUILD, "translate")
    os.makedirs(out, exist_ok=True)
    os.makedirs(os.path.join(BUILD, "labels", "vision"), exist_ok=True)
    os.makedirs(os.path.join(BUILD, "labels", "translate"), exist_ok=True)
    os.makedirs(os.path.join(BUILD, "labels", "heldout"), exist_ok=True)
    names = []
    for i in range(math.ceil(len(covered) / PER)):
        chunk = covered[i * PER:(i + 1) * PER]
        items = []
        for c in chunk:
            b = base[c["representative"]]
            items.append({
                "cluster_id": c["cluster_id"], "name": b["name"], "file": b["file"],
                "type": b["type"], "atlas": b.get("atlas"),
                "size": "%sx%s" % (b.get("width"), b.get("height")),
                "members": c["size"],
                "corpus": b["corpus"][:4],
            })
        nm = "batch-%02d" % i
        with io.open(os.path.join(out, nm + ".json"), "w", encoding="utf-8", newline="\n") as fh:
            json.dump({"batch": nm, "items": items}, fh, ensure_ascii=False, indent=1)
        names.append(nm)
    print(json.dumps({"covered_clusters": len(covered), "batches": len(names)}, indent=1))


if __name__ == "__main__":
    main()
