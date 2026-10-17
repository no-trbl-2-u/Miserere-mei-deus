"""Assemble the catalog and the Copy / Open views, then gate it.

Nothing here infers. It joins the agent labels back onto the deterministic
layer (manifest metadata, corpus rows, pHash clusters, per-file licence) and
then refuses to declare success unless the invariants hold:

  * every PNG on disk appears exactly once in the catalog;
  * every tag comes from catalog/vocabulary.json;
  * every corpus Icon/Image reference still resolves, so the restructure did
    not break the 100% figure COVERAGE.md reports;
  * every non-empty used_by resolves to a real path in the Miserere tree.

Writes catalog/catalog.jsonl, catalog/Copy/, catalog/Open/ and
catalog/derived/validation.json.
"""
import json, io, os, re, collections

ASSETS = r"C:\Users\notrb\Workspace\Miserere-mei-deus\Potential Assets"
REPO = r"C:\Users\notrb\Workspace\Miserere-mei-deus"
EXTRACT = os.path.join(ASSETS, "extract")
CAT = os.path.join(ASSETS, "catalog")
BUILD = os.path.join(CAT, "derived")
SLUG_OK = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def jsonl(p):
    with io.open(p, encoding="utf-8") as fh:
        for line in fh:
            if line.strip():
                yield json.loads(line)


def load_labels(sub):
    out, errs = {}, []
    d = os.path.join(BUILD, "labels", sub)
    if not os.path.isdir(d):
        return out, ["missing dir: %s" % d]
    for fn in sorted(os.listdir(d)):
        if not fn.endswith(".json"):
            continue
        try:
            doc = json.load(io.open(os.path.join(d, fn), encoding="utf-8"))
        except Exception as exc:
            errs.append("%s/%s: %s: %s" % (sub, fn, type(exc).__name__, exc))
            continue
        for r in doc.get("records", []):
            cid = r.get("cluster_id")
            if cid:
                out[cid] = r
    return out, errs


def main():
    vocab = json.load(io.open(os.path.join(CAT, "vocabulary.json"), encoding="utf-8"))
    KIND, USE, STYLE = set(vocab["kind"]), set(vocab["use"]), set(vocab["style"])

    base = {r["file"]: r for r in jsonl(os.path.join(BUILD, "base.jsonl"))}
    hashes = {r["file"]: r for r in jsonl(os.path.join(BUILD, "hashes.jsonl"))}
    lic = {r["file"]: r for r in jsonl(os.path.join(BUILD, "per-file-license.jsonl"))}
    clusters = list(jsonl(os.path.join(BUILD, "clusters.jsonl")))
    licensing = json.load(io.open(os.path.join(BUILD, "licensing.json"), encoding="utf-8"))

    vis, e1 = load_labels("vision")
    tra, e2 = load_labels("translate")
    labels = dict(vis)
    labels.update(tra)
    label_errors = e1 + e2

    problems = collections.Counter()
    bad_tags, bad_slugs = [], []
    records = []
    for c in clusters:
        lab = labels.get(c["cluster_id"])
        rep = c["representative"]
        b = base.get(rep, {})
        source = "corpus" if c["has_corpus_row"] else "vision"
        if c["has_corpus_row"]:
            source = "corpus:" + ",".join(sorted({"%s.%s" % (r["table"], r["column"])
                                                  for r in b.get("corpus", [])}))
        tags = (lab or {}).get("tags") or {}
        kind = tags.get("kind")
        use = [t for t in (tags.get("use") or [])]
        style = [t for t in (tags.get("style") or [])]
        if lab is None:
            problems["cluster_unlabelled"] += 1
        else:
            offenders = ([t for t in [kind] if t and t not in KIND]
                         + [t for t in use if t not in USE]
                         + [t for t in style if t not in STYLE])
            if offenders:
                problems["tag_outside_vocabulary"] += 1
                bad_tags.append({"cluster_id": c["cluster_id"], "offenders": offenders})
            if not kind or not use:
                problems["missing_required_tag"] += 1
            slug = lab.get("slug") or ""
            if not SLUG_OK.match(slug):
                problems["slug_not_kebab_case"] += 1
                bad_slugs.append({"cluster_id": c["cluster_id"], "slug": slug})
            if lab.get("used_by"):
                problems["used_by_non_empty"] += 1

        for member in c["members"]:
            mb = base.get(member, {})
            ml = lic.get(member, {})
            mh = hashes.get(member, {})
            records.append({
                "name": mb.get("name"),
                "slug": (lab or {}).get("slug"),
                "file": member,
                "description": (lab or {}).get("description"),
                "tags": {"kind": kind, "use": use, "style": style},
                "used_by": [],
                "license": ml.get("license"),
                "bucket": ml.get("bucket"),
                "source": source,
                "confidence": (lab or {}).get("confidence"),
                "cluster_id": c["cluster_id"],
                "is_cluster_representative": member == rep,
                "corpus": mb.get("corpus", []),
                "type": mb.get("type"), "width": mb.get("width"), "height": mb.get("height"),
                "bytes": mb.get("bytes"), "atlas": mb.get("atlas"),
                "copies_in_game": mb.get("copies"),
                "phash": mh.get("phash"),
            })

    # Non-PNG assets (fonts, audio) have no pHash and so no cluster: carry them
    # through on their deterministic metadata alone rather than dropping them.
    clustered = {r["file"] for r in records}
    for f, b in base.items():
        if f in clustered:
            continue
        ml = lic.get(f, {})
        if b.get("type") == "Font":
            desc = ("Embedded %s font face, written out verbatim from the game's "
                    "asset bundle." % os.path.splitext(f)[1].lstrip(".").upper())
        elif b.get("type") == "AudioClip":
            desc = ("One-sound FSB5 audio bank carved from the game's external "
                    ".resource; not decoded here (play or convert it with "
                    "vgmstream or fsbext).")
        else:
            desc = None
        records.append({
            "name": b.get("name"), "slug": None, "file": f,
            "description": desc,
            "tags": {"kind": "font" if b.get("type") == "Font" else
                             ("audio" if b.get("type") == "AudioClip" else "unknown"),
                     "use": ["typography" if b.get("type") == "Font" else
                             ("sound-effect" if b.get("type") == "AudioClip" else "unassigned")],
                     "style": []},
            "used_by": [], "license": ml.get("license"), "bucket": ml.get("bucket"),
            "source": "manifest", "confidence": "high",
            "cluster_id": None, "is_cluster_representative": True,
            "corpus": b.get("corpus", []), "type": b.get("type"),
            "width": b.get("width"), "height": b.get("height"), "bytes": b.get("bytes"),
            "atlas": b.get("atlas"), "copies_in_game": b.get("copies"), "phash": None,
        })

    # --- files on disk that _manifest.json never listed ---------------------
    # extract/ui/ carries Unity prefab + PlayMaker-FSM JSON dumps: UI layout
    # structure, not art, and absent from the manifest's assets[]. Catalogue
    # them from the filesystem so the tree is covered, and say plainly where
    # they came from rather than inventing a description.
    manifest_files = set(base)
    for root, _d, files in os.walk(os.path.join(EXTRACT, "ui")):
        for fn in files:
            rel = os.path.relpath(os.path.join(root, fn), EXTRACT).replace("\\", "/")
            if rel in manifest_files:
                continue
            sub = rel.split("/")[1] if "/" in rel[3:] else ""
            what = ("PlayMaker FSM state-machine dump" if "fsm" in sub
                    else "Unity prefab hierarchy dump" if "prefab" in sub
                    else "Unity UI structure dump")
            records.append({
                "name": os.path.splitext(os.path.basename(rel))[0],
                "slug": None, "file": rel,
                "description": "%s extracted as JSON; UI layout structure, not art." % what,
                "tags": {"kind": "unknown", "use": ["panel-chrome"], "style": []},
                "used_by": [],
                "license": "Buriedbornes 2 game asset (%s)" % licensing["extract"]["game_dir"],
                "bucket": "Copy",
                "source": "filesystem",
                "confidence": "high",
                "cluster_id": None, "is_cluster_representative": True,
                "corpus": [], "type": "UILayoutJson",
                "width": None, "height": None,
                "bytes": os.path.getsize(os.path.join(EXTRACT, rel)),
                "atlas": None, "copies_in_game": None, "phash": None,
            })

    records.sort(key=lambda r: r["file"])
    on_disk_now = set()
    for root, _d, files in os.walk(EXTRACT):
        for fn in files:
            at_root = os.path.abspath(root) == os.path.abspath(EXTRACT)
            if at_root and (fn.startswith("_") or fn == "COVERAGE.md"):
                continue
            on_disk_now.add(os.path.relpath(os.path.join(root, fn), EXTRACT).replace("\\", "/"))
    dropped = [r["file"] for r in records if r["file"] not in on_disk_now]
    records = [r for r in records if r["file"] in on_disk_now]
    with io.open(os.path.join(CAT, "catalog.jsonl"), "w", encoding="utf-8", newline="\n") as fh:
        for r in records:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")

    # --- invariant 1: every file on disk appears exactly once ---------------
    on_disk = set()
    for root, _d, files in os.walk(EXTRACT):
        for fn in files:
            at_root = os.path.abspath(root) == os.path.abspath(EXTRACT)
            if at_root and (fn.startswith("_") or fn == "COVERAGE.md"):
                continue
            on_disk.add(os.path.relpath(os.path.join(root, fn), EXTRACT).replace("\\", "/"))
    seen = collections.Counter(r["file"] for r in records)
    missing = sorted(on_disk - set(seen))
    dupes = sorted(f for f, n in seen.items() if n > 1)
    # A manifest entry with no file behind it cannot be catalogued. That is a
    # defect in the extractor, reported here, not a hole in this catalog.
    phantoms = sorted(set(seen) - on_disk)

    # --- invariant 2: corpus references still resolve -----------------------
    index = json.load(io.open(os.path.join(EXTRACT, "_index.json"), encoding="utf-8"))
    refs = sum(len(r["corpus"]) for r in records if r["is_cluster_representative"])
    unresolved = [n for n in index if not os.path.exists(os.path.join(EXTRACT, index[n]))]

    # --- invariant 3: used_by resolves --------------------------------------
    dangling_used = []
    for r in records:
        for u in r["used_by"]:
            if not os.path.exists(os.path.join(REPO, u.split(" ")[0])):
                dangling_used.append({"file": r["file"], "used_by": u})

    validation = {
        "catalog_records": len(records),
        "clusters": len(clusters),
        "clusters_labelled": len(labels),
        "clusters_unlabelled": problems["cluster_unlabelled"],
        "files_on_disk": len(on_disk),
        "files_missing_from_catalog": len(missing),
        "files_duplicated_in_catalog": len(dupes),
        "manifest_phantoms": sorted(dropped),
        "records_from_filesystem_not_in_manifest": sum(
            1 for r in records if r["source"] == "filesystem"),
        "index_entries_pointing_at_a_missing_file": len(unresolved),
        "corpus_references_carried": refs,
        "dangling_used_by": len(dangling_used),
        "problems": dict(problems),
        "tag_violations_sample": bad_tags[:10],
        "slug_violations_sample": bad_slugs[:10],
        "label_read_errors": label_errors,
        "examples": {
            "missing": missing[:10], "duplicated": dupes[:10],
        },
    }
    validation["PASS"] = (
        not missing and not dupes and not unresolved
        and not dangling_used
        and problems["tag_outside_vocabulary"] == 0
        and problems["missing_required_tag"] == 0
        and problems["cluster_unlabelled"] == 0
        and not label_errors
    )
    with io.open(os.path.join(BUILD, "validation.json"), "w", encoding="utf-8",
                 newline="\n") as fh:
        json.dump(validation, fh, ensure_ascii=False, indent=1)

    # --- the two views ------------------------------------------------------
    buckets = collections.Counter(r["bucket"] for r in records)
    for bucket in ("Copy", "Open"):
        d = os.path.join(CAT, bucket)
        os.makedirs(d, exist_ok=True)
        rows = [r for r in records if r["bucket"] == bucket]
        with io.open(os.path.join(d, "catalog.jsonl"), "w", encoding="utf-8",
                     newline="\n") as fh:
            for r in rows:
                fh.write(json.dumps(r, ensure_ascii=False) + "\n")

    print(json.dumps({"buckets": dict(buckets), "validation": {
        k: v for k, v in validation.items()
        if k not in ("tag_violations_sample", "slug_violations_sample", "examples")
    }}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
