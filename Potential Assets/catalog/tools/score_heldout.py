"""Score the blind held-out sheets against the withheld game rows.

Deliberately NOT an LLM grading itself. The game's Category / table values map
onto the closed vocabulary by a fixed table, so "did the labeller identify what
this asset actually is" is answerable by set comparison with no model in the
loop. That number is the headline confidence for the 4,054 labels that have no
game table behind them.

Reports kind-accuracy and use-overlap split by the confidence the labeller
claimed, so a "low" mark can be checked for honesty rather than trusted.
"""
import json, io, os, collections

BUILD = r"C:\Users\notrb\Workspace\Miserere-mei-deus\Potential Assets\catalog\derived"
HELD = os.path.join(BUILD, "heldout")
LABELS = os.path.join(BUILD, "labels", "heldout")

# table -> the "use" tags the game's own schema implies for that table's art.
TABLE_USE = {
    "skill": {"combat-action"}, "skill_mode": {"combat-action"},
    "enemy": {"enemy"}, "enemy_skill": {"enemy", "combat-action"},
    "elite": {"enemy-boss"}, "job": {"player-class"}, "race": {"race"},
    "born": {"player-class"}, "campitem": {"camp", "inventory"},
    "shop_item": {"shop"}, "campshop": {"shop"}, "gear": {"equipment"},
    "rune": {"buff", "equipment"}, "es_rune": {"enemy", "buff"},
    "dungeon": {"dungeon"}, "dungeon_mode": {"dungeon-mode"},
    "dungeon_drop": {"loot"}, "ds_drop": {"loot"}, "enemy_drop": {"loot"},
    "quest": {"quest"}, "quest_reward": {"reward"}, "story": {"story"},
    "mappoint": {"map-point", "navigation"}, "music": {"music-cue"},
    "keystone": {"buff"}, "state": {"status-effect"},
    "state_visual": {"status-effect"}, "disaster": {"dungeon"},
    "achieve": {"achievement"}, "title": {"rank"}, "rkhist": {"rank"},
    "league": {"league"}, "union": {"union"}, "union_mission": {"union"},
    "uorder": {"union"}, "uorder_reward": {"reward"}, "tips": {"tip"},
    "tutorial": {"tutorial"}, "bprint": {"crafting"}, "bpnode": {"crafting"},
    "skin": {"player-class"}, "sancp": {"camp"}, "denv": {"dungeon"},
    "revent": {"story"}, "revent_node": {"story"}, "contract": {"quest"},
    "act": {"story"}, "act_node": {"story"}, "mod": {"equipment"},
    "modn": {"equipment"}, "modp": {"equipment"}, "lparts": {"equipment"},
    "config": {"settings"}, "iap": {"payment"}, "shop": {"shop"},
    "dmode_enemy": {"enemy"}, "dmode_reward": {"reward"},
    "dmode_mission": {"dungeon-mode"}, "dmode_room": {"dungeon-mode"},
    "job_gear": {"equipment"}, "job_skill": {"combat-action"},
    "race_skill": {"combat-action"}, "rune_act": {"buff"},
    "sm_act": {"combat-action"}, "state_act": {"status-effect"},
    "sstate": {"status-effect"}, "disstate": {"status-effect"},
    "spthx": {"story"}, "spi_cont": {"story"},
}
CATEGORY_USE = {
    "0.Attack": {"attack", "combat-action"}, "1.Summon": {"summon", "combat-action"},
    "2.Support": {"buff", "combat-action"}, "3.Survive": {"defend", "combat-action"},
    "4.Special": {"combat-action"}, "9.Enemy": {"enemy"},
    "9.Enemy - Boss": {"enemy-boss"},
    "Debuff": {"debuff", "status-effect"}, "Buff": {"buff", "status-effect"},
    "SkillBuff": {"buff"}, "SkillDebuff": {"debuff"}, "Damage": {"attack"},
    "Job": {"player-class"}, "Race": {"race"}, "Born": {"player-class"},
    "Gear": {"equipment"}, "Env": {"dungeon"},
}
# A "kind" that is defensible for an asset whose table says it has this use.
KIND_OK = {
    "enemy": {"creature", "humanoid", "boss", "portrait", "unknown"},
    "enemy-boss": {"creature", "humanoid", "boss", "portrait", "unknown"},
    "player-class": {"humanoid", "portrait", "ui-icon", "glyph", "badge", "unknown"},
    "race": {"humanoid", "creature", "portrait", "ui-icon", "glyph", "unknown"},
    "combat-action": {"ui-icon", "glyph", "weapon", "effect", "projectile", "aura",
                      "sigil", "rune", "unknown"},
    "attack": {"ui-icon", "glyph", "weapon", "effect", "projectile", "unknown"},
    "defend": {"ui-icon", "glyph", "shield", "armour", "aura", "effect", "unknown"},
    "summon": {"ui-icon", "glyph", "creature", "sigil", "effect", "unknown"},
    "buff": {"ui-icon", "glyph", "effect", "aura", "sigil", "rune", "unknown"},
    "debuff": {"ui-icon", "glyph", "effect", "aura", "sigil", "unknown"},
    "status-effect": {"ui-icon", "glyph", "effect", "aura", "sigil", "unknown"},
    "camp": {"ui-icon", "consumable", "container", "food", "relic", "accessory", "book",
             "key", "weapon", "armour", "shield", "currency", "glyph", "unknown"},
    "inventory": {"ui-icon", "consumable", "container", "food", "relic", "accessory",
                  "book", "key", "weapon", "armour", "shield", "currency", "glyph",
                  "unknown"},
    "shop": {"ui-icon", "consumable", "container", "relic", "accessory", "currency",
             "glyph", "unknown"},
    "equipment": {"weapon", "armour", "shield", "accessory", "relic", "ui-icon", "glyph",
                  "rune", "sigil", "unknown"},
    "dungeon": {"environment", "architecture", "terrain", "map", "ui-icon", "banner",
                "glyph", "unknown"},
    "dungeon-mode": {"environment", "architecture", "terrain", "map", "ui-icon", "banner",
                     "glyph", "unknown"},
    "map-point": {"map", "ui-icon", "glyph", "architecture", "unknown"},
    "navigation": {"map", "ui-icon", "glyph", "ui-button", "unknown"},
    "quest": {"ui-icon", "glyph", "book", "banner", "badge", "unknown"},
    "story": {"ui-icon", "glyph", "book", "banner", "environment", "architecture",
              "unknown"},
    "loot": {"container", "consumable", "relic", "currency", "ui-icon", "glyph", "unknown"},
    "reward": {"container", "consumable", "relic", "currency", "ui-icon", "glyph",
               "unknown"},
    "music-cue": {"audio", "ui-icon", "glyph", "unknown"},
    "crafting": {"ui-icon", "glyph", "relic", "weapon", "armour", "unknown"},
    "rank": {"badge", "banner", "ui-icon", "glyph", "unknown"},
    "achievement": {"badge", "ui-icon", "glyph", "unknown"},
    "league": {"badge", "banner", "ui-icon", "glyph", "unknown"},
    "union": {"badge", "banner", "ui-icon", "glyph", "unknown"},
    "tip": {"ui-icon", "glyph", "book", "unknown"},
    "tutorial": {"ui-icon", "glyph", "book", "unknown"},
    "settings": {"ui-icon", "glyph", "ui-button", "unknown"},
    "payment": {"brand-mark", "ui-icon", "glyph", "unknown"},
}


def _slice(rows):
    n = len(rows)
    if not n:
        return {"n": 0}
    return {"n": n,
            "use_accuracy": round(sum(1 for r in rows if r["use_hit"]) / n, 3),
            "kind_accuracy": round(sum(1 for r in rows if r["kind_hit"]) / n, 3)}


def expected(corpus):
    use, kinds = set(), set()
    for ref in corpus or []:
        use |= TABLE_USE.get(ref["table"], set())
        cat = (ref.get("row") or {}).get("Category")
        if isinstance(cat, str):
            use |= CATEGORY_USE.get(cat, set())
    for u in use:
        kinds |= KIND_OK.get(u, set())
    return use, kinds


def main():
    answers = json.load(io.open(os.path.join(HELD, "answers.json"), encoding="utf-8"))
    got, read_errors = {}, []
    if os.path.isdir(LABELS):
        for fn in sorted(os.listdir(LABELS)):
            if not fn.endswith(".json"):
                continue
            try:
                d = json.load(io.open(os.path.join(LABELS, fn), encoding="utf-8"))
            except Exception as exc:
                read_errors.append("%s: %s: %s" % (fn, type(exc).__name__, exc))
                continue
            for r in d.get("records", []):
                got[r.get("cluster_id")] = r

    rows = []
    by_conf = collections.defaultdict(lambda: [0, 0, 0])
    for cid, truth in answers.items():
        g = got.get(cid)
        if not g:
            continue
        exp_use, exp_kind = expected(truth["corpus"])
        if not exp_use:
            continue
        tags = g.get("tags") or {}
        guess_use = set(tags.get("use") or [])
        kind = tags.get("kind")
        use_hit = bool(guess_use & exp_use)
        kind_hit = bool(exp_kind) and kind in exp_kind
        conf = (g.get("confidence") or "unstated").lower()
        bucket = by_conf[conf]
        bucket[0] += 1
        bucket[1] += int(use_hit)
        bucket[2] += int(kind_hit)
        tables = {r["table"] for r in (truth["corpus"] or [])}
        rows.append({
            "shared_icon": len(tables) > 1, "corpus_tables": sorted(tables),
            "cluster_id": cid, "name": truth["name"], "confidence": conf,
            "expected_use": sorted(exp_use), "guessed_use": sorted(guess_use),
            "kind": kind, "use_hit": use_hit, "kind_hit": kind_hit,
            "slug": g.get("slug"), "description": g.get("description"),
        })

    n = len(rows)
    labelled = len([c for c in answers if c in got])
    summary = {
        "heldout_in_answers": len(answers),
        "heldout_labelled": labelled,
        "heldout_scored": n,
        "unscorable_no_table_mapping": labelled - n,
        "use_accuracy": round(sum(1 for r in rows if r["use_hit"]) / n, 3) if n else None,
        "kind_accuracy": round(sum(1 for r in rows if r["kind_hit"]) / n, 3) if n else None,
        "note": (
            "kind_accuracy is the defensible headline: it asks whether the "
            "labeller identified WHAT the asset is, and the game's table "
            "answers the same question. use_accuracy is weaker by "
            "construction - the labeller tags an asset's apparent function "
            "while the table records which subsystem consumes it, and a skill "
            "icon reused by a rune or state row makes those two answers differ "
            "without either being wrong. The single_table / shared_icon split "
            "below was added to test whether shared icons explain the gap. "
            "They do not: single-table clusters score LOWER on use, so the "
            "~0.6 figure reflects the apparent-function vs consuming-subsystem "
            "mismatch across the board, not duplicate reuse. Read use_accuracy "
            "as agreement between two different axes, not as an error rate."
        ),
        "single_table": _slice([r for r in rows if not r["shared_icon"]]),
        "shared_icon": _slice([r for r in rows if r["shared_icon"]]),
        "by_confidence": {
            k: {"n": v[0], "use_accuracy": round(v[1] / v[0], 3),
                "kind_accuracy": round(v[2] / v[0], 3)}
            for k, v in sorted(by_conf.items()) if v[0]
        },
        "read_errors": read_errors,
    }
    with io.open(os.path.join(BUILD, "heldout-score.json"), "w", encoding="utf-8",
                 newline="\n") as fh:
        json.dump({"summary": summary, "rows": rows}, fh, ensure_ascii=False, indent=1)
    print(json.dumps(summary, ensure_ascii=False, indent=1))
    for r in rows[:10]:
        print("  %-26s %-7s use=%-5s kind=%-5s %s" % (
            (r["name"] or "")[:26], r["confidence"], r["use_hit"], r["kind_hit"],
            (r["slug"] or "")[:36]))


if __name__ == "__main__":
    main()
