import gzip
import json
import csv
from pathlib import Path

INPUT_FILE = Path(r"C:\Users\32140\Desktop\smart_bookshelf\serve\bookshelf\data\ol_dump_works_2026-02-28.txt.gz")
OUTPUT_FILE = Path(r"C:\Users\32140\Desktop\smart_bookshelf\serve\bookshelf\data\books_openlibrary_sample.csv")

MAX_ROWS = 5000


def normalize_summary(summary):
    if not summary:
        return ""
    if isinstance(summary, str):
        return summary.strip()
    if isinstance(summary, dict):
        return str(summary.get("value", "")).strip()
    return ""


def normalize_subjects(subjects):
    if not subjects:
        return "", ""
    if not isinstance(subjects, list):
        return "", ""
    cleaned = [str(x).strip() for x in subjects if str(x).strip()]
    keywords = ", ".join(cleaned[:10])
    category = cleaned[0] if cleaned else ""
    return category, keywords


def normalize_title(title):
    if not title:
        return ""
    return str(title).strip()


def extract_row(obj):
    title = normalize_title(obj.get("title"))
    summary = normalize_summary(obj.get("description"))
    category, keywords = normalize_subjects(obj.get("subjects", []))

    authors = []
    for a in obj.get("authors", []):
        author_info = a.get("author")
        if isinstance(author_info, dict):
            key = author_info.get("key", "")
            if key:
                authors.append(key)

    author = "; ".join(authors[:5])

    return {
        "title": title,
        "author": author,
        "category": category,
        "keywords": keywords,
        "summary": summary,
    }


def main():
    count = 0

    with gzip.open(INPUT_FILE, "rt", encoding="utf-8", errors="ignore") as fin, \
         open(OUTPUT_FILE, "w", newline="", encoding="utf-8-sig") as fout:

        writer = csv.DictWriter(
            fout,
            fieldnames=["title", "author", "category", "keywords", "summary"]
        )
        writer.writeheader()

        for line in fin:
            parts = line.rstrip("\n").split("\t", 4)
            if len(parts) != 5:
                continue

            record_type, key, revision, last_modified, raw_json = parts

            if record_type != "/type/work":
                continue

            try:
                obj = json.loads(raw_json)
            except json.JSONDecodeError:
                continue

            row = extract_row(obj)

            if not row["title"]:
                continue

            writer.writerow(row)
            count += 1

            if count >= MAX_ROWS:
                break

    print(f"Done. Wrote {count} rows to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()