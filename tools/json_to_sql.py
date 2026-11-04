#!/usr/bin/env python3
"""Génère private/seed_questions.sql à partir de private/questions.json.

Usage :  python3 tools/json_to_sql.py
Le fichier SQL produit est à coller dans le SQL Editor de Supabase
APRÈS avoir exécuté supabase/schema.sql.
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "private" / "questions.json"
DST = ROOT / "private" / "seed_questions.sql"

# Chapitre -> domaine CISSP (Official Study Guide, 10e édition)
DOMAIN = {1: 1, 2: 1, 3: 1, 4: 1, 5: 2, 6: 3, 7: 3, 8: 3, 9: 3, 10: 3,
          11: 4, 12: 4, 13: 5, 14: 5, 15: 6, 16: 7, 17: 7, 18: 7, 19: 7,
          20: 8, 21: 8}


def q(s: str) -> str:
    """Littéral SQL échappé."""
    return "'" + s.replace("'", "''") + "'"


def main() -> None:
    data = json.loads(SRC.read_text(encoding="utf-8"))
    out = ["-- Généré par tools/json_to_sql.py : NE PAS publier (contenu sous copyright).",
           "begin;"]
    out.append("insert into public.chapters (id, title, domain) values")
    out.append(",\n".join(f"  ({c['chapter']}, {q(c['title'])}, {DOMAIN[c['chapter']]})" for c in data))
    out.append("on conflict (id) do update set title = excluded.title, domain = excluded.domain;")
    rows = []
    for c in data:
        for item in c["questions"]:
            multi = len(item["ans"]) > 1 or bool(re.search(r"choose all that apply", item["q"], re.I))
            rows.append("  ({ch}, {n}, {qt}, {opts}::jsonb, {ans}::jsonb, {exp}, {multi})".format(
                ch=c["chapter"], n=item["n"], qt=q(item["q"]),
                opts=q(json.dumps(item["opts"], ensure_ascii=False)),
                ans=q(json.dumps(item["ans"])), exp=q(item["exp"]),
                multi="true" if multi else "false"))
    out.append("insert into public.questions (chapter_id, number, question, options, correct, explanation, multi) values")
    out.append(",\n".join(rows))
    out.append("on conflict (chapter_id, number) do update set question = excluded.question, options = excluded.options,"
               " correct = excluded.correct, explanation = excluded.explanation, multi = excluded.multi;")
    out.append("commit;")
    DST.write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"{len(rows)} questions écrites dans {DST}")


if __name__ == "__main__":
    main()
