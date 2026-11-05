#!/usr/bin/env python3
"""Génère les fichiers d'import SQL à partir de private/questions.json et private/practice.json.

Usage :  python3 tools/json_to_sql.py

Produit :
  private/seed_questions.sql          Study Guide, tout en un seul fichier
  private/seed_part1.sql .. 3         même contenu en 3 morceaux (chapitres 1-7, 8-14, 15-21)
  private/seed_practice_part1..6.sql  Official Practice Tests (2 chapitres par fichier)
  private/seed_ccsp_guide.sql         CCSP Study Guide (chapitres 201-210)
  private/seed_ccsp_practice_part1..4.sql  CCSP Official Practice Tests (2 chapitres par fichier)

Les textes sont encodés en base64 : l'éditeur SQL de Supabase ne peut donc
pas mal interpréter les apostrophes, $, ;, -- ou autres caractères du livre.
À exécuter APRÈS supabase/schema.sql. L'import est idempotent (pas de doublons).
"""
import base64
import json
import pathlib
import re
import textwrap

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "private" / "questions.json"
SRC_PRACTICE = ROOT / "private" / "practice.json"
OUT = ROOT / "private"

# Chapitre -> domaine CISSP (Official Study Guide, 10e édition)
DOMAIN = {1: 1, 2: 1, 3: 1, 4: 1, 5: 2, 6: 3, 7: 3, 8: 3, 9: 3, 10: 3,
          11: 4, 12: 4, 13: 5, 14: 5, 15: 6, 16: 7, 17: 7, 18: 7, 19: 7,
          20: 8, 21: 8,
          # Official Practice Tests : chapitres 101-108 = domaines 1-8, 109-112 = tests complets
          101: 1, 102: 2, 103: 3, 104: 4, 105: 5, 106: 6, 107: 7, 108: 8,
          # CCSP Study Guide 3e éd. (201-210) -> domaines CCSP 1-6
          201: 1, 202: 2, 203: 2, 204: 3, 205: 3, 206: 4, 207: 5, 208: 5, 209: 6, 210: 6,
          # CCSP Official Practice Tests 3e éd. : 301-306 = domaines 1-6, 307-308 = tests complets
          301: 1, 302: 2, 303: 3, 304: 4, 305: 5, 306: 6,
          # « CISSP: The Last Mile » (QCM originaux) : 401-408 = domaines 1-8
          401: 1, 402: 2, 403: 3, 404: 4, 405: 5, 406: 6, 407: 7, 408: 8}


def b64(obj) -> str:
    raw = base64.b64encode(json.dumps(obj, ensure_ascii=False).encode("utf-8")).decode("ascii")
    return "\n".join(textwrap.wrap(raw, 100))


def chapters_sql(data) -> str:
    rows = [{"id": c["chapter"], "title": c["title"], "title_fr": c.get("title_fr"), "domain": DOMAIN.get(c["chapter"])} for c in data]
    return (
        "insert into public.chapters (id, title, domain, title_fr)\n"
        "select (e->>'id')::int, e->>'title', (e->>'domain')::int, e->>'title_fr'\n"
        f"from jsonb_array_elements(convert_from(decode('\n{b64(rows)}\n', 'base64'), 'UTF8')::jsonb) as e\n"
        "on conflict (id) do update set title = excluded.title, domain = excluded.domain, title_fr = excluded.title_fr;\n"
    )


def chapter_questions_sql(c) -> str:
    rows = []
    for item in c["questions"]:
        multi = len(item["ans"]) > 1 or bool(re.search(r"(choose|select) all (that|answers that) apply", item["q"], re.I))
        rows.append({"n": item["n"], "q": item["q"], "opts": item["opts"], "ans": item["ans"],
                     "exp": item["exp"], "multi": multi,
                     "q_fr": item.get("q_fr"), "opts_fr": item.get("opts_fr"), "exp_fr": item.get("exp_fr"),
                     "sc": item.get("scenario"), "sc_fr": item.get("scenario_fr")})
    return (
        f"-- Chapitre {c['chapter']} : {len(rows)} questions\n"
        "insert into public.questions (chapter_id, number, question, options, correct, explanation, multi,\n"
        "  question_fr, options_fr, explanation_fr, scenario, scenario_fr)\n"
        f"select {c['chapter']}, (e->>'n')::int, e->>'q', e->'opts', e->'ans', e->>'exp', (e->>'multi')::boolean,\n"
        "  e->>'q_fr', nullif(e->'opts_fr', 'null'::jsonb), e->>'exp_fr', e->>'sc', e->>'sc_fr'\n"
        f"from jsonb_array_elements(convert_from(decode('\n{b64(rows)}\n', 'base64'), 'UTF8')::jsonb) as e\n"
        "on conflict (chapter_id, number) do update set question = excluded.question, options = excluded.options,\n"
        "  correct = excluded.correct, explanation = excluded.explanation, multi = excluded.multi,\n"
        "  question_fr = excluded.question_fr, options_fr = excluded.options_fr, explanation_fr = excluded.explanation_fr,\n"
        "  scenario = excluded.scenario, scenario_fr = excluded.scenario_fr;\n"
    )


def build(data, chapters, title, count_label="questions_importees", where="") -> str:
    parts = [f"-- {title}\n-- Généré par tools/json_to_sql.py : NE PAS publier (contenu sous copyright).\n",
             chapters_sql(data)]
    parts += [chapter_questions_sql(c) for c in data if c["chapter"] in chapters]
    parts.append(f"select count(*) as {count_label} from public.questions{where};\n")
    return "\n".join(parts)


def main() -> None:
    data = json.loads(SRC.read_text(encoding="utf-8"))
    all_ch = [c["chapter"] for c in data]
    (OUT / "seed_questions.sql").write_text(build(data, all_ch, "Import complet (420 questions)"), encoding="utf-8")
    groups = [range(1, 8), range(8, 15), range(15, 22)]
    for i, g in enumerate(groups, 1):
        (OUT / f"seed_part{i}.sql").write_text(
            build(data, list(g), f"Partie {i}/3 : chapitres {g.start} à {g.stop - 1}"), encoding="utf-8")
    print(f"{sum(len(c['questions']) for c in data)} questions -> seed_questions.sql + seed_part1..3.sql")

    if SRC_PRACTICE.exists():
        pr = json.loads(SRC_PRACTICE.read_text(encoding="utf-8"))
        ids = [c["chapter"] for c in pr]
        groups = [ids[i:i + 2] for i in range(0, len(ids), 2)]
        for i, g in enumerate(groups, 1):
            n = sum(len(c["questions"]) for c in pr if c["chapter"] in g)
            (OUT / f"seed_practice_part{i}.sql").write_text(
                build(pr, g, f"Practice Tests, partie {i}/{len(groups)} : chapitres {g[0]}-{g[-1]} ({n} questions)",
                      "questions_practice_importees", " where chapter_id > 100"), encoding="utf-8")
        print(f"{sum(len(c['questions']) for c in pr)} questions Practice Tests -> seed_practice_part1..{len(groups)}.sql")


def main_ccsp() -> None:
    g = OUT / "ccsp_guide.json"
    if g.exists():
        data = json.loads(g.read_text(encoding="utf-8"))
        n = sum(len(c["questions"]) for c in data)
        (OUT / "seed_ccsp_guide.sql").write_text(
            build(data, [c["chapter"] for c in data], f"CCSP Study Guide ({n} questions)",
                  "questions_ccsp_guide_importees", " where chapter_id between 201 and 300"), encoding="utf-8")
        print(f"{n} questions CCSP Study Guide -> seed_ccsp_guide.sql")
    p = OUT / "ccsp_practice.json"
    if p.exists():
        pr = json.loads(p.read_text(encoding="utf-8"))
        ids = [c["chapter"] for c in pr]
        groups = [ids[i:i + 2] for i in range(0, len(ids), 2)]
        for i, g in enumerate(groups, 1):
            n = sum(len(c["questions"]) for c in pr if c["chapter"] in g)
            (OUT / f"seed_ccsp_practice_part{i}.sql").write_text(
                build(pr, g, f"CCSP Practice Tests, partie {i}/{len(groups)} : chapitres {g[0]}-{g[-1]} ({n} questions)",
                      "questions_ccsp_practice_importees", " where chapter_id > 300"), encoding="utf-8")
        print(f"{sum(len(c['questions']) for c in pr)} questions CCSP Practice Tests -> seed_ccsp_practice_part1..{len(groups)}.sql")


def main_lastmile() -> None:
    p = OUT / "lastmile.json"
    if not p.exists():
        return
    data = json.loads(p.read_text(encoding="utf-8"))
    n = sum(len(c["questions"]) for c in data)
    (OUT / "seed_lastmile.sql").write_text(
        build(data, [c["chapter"] for c in data], f"CISSP Last Mile ({n} questions originales)",
              "questions_lastmile_importees", " where chapter_id between 401 and 500"), encoding="utf-8")
    print(f"{n} questions Last Mile -> seed_lastmile.sql")


if __name__ == "__main__":
    main_lastmile()
    main_ccsp()
    main()
