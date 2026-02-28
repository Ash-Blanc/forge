#!/usr/bin/env python3
"""
Bidirectional sync between tasks.md and a Notion page.

Supports:
  - Headings (# / ## / ###) ↔ Notion heading_1/2/3
  - Checkboxes (- [ ] / - [x]) ↔ Notion to_do blocks
  - Plain text lines ↔ Notion paragraph blocks
  - Blank lines preserved as spacers

Usage:
  python sync_notion.py push   # tasks.md → Notion
  python sync_notion.py pull   # Notion → tasks.md
"""

import os
import sys
import json
import re
import requests

NOTION_TOKEN = os.environ["NOTION_TOKEN"]
NOTION_PAGE_ID = os.environ["NOTION_PAGE_ID"]

HEADERS = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Notion-Version": "2022-06-01",
    "Content-Type": "application/json",
}


# ─────────────────────────── Markdown → Notion ────────────────────────────

def md_line_to_block(line: str) -> dict | None:
    """Convert a single markdown line to a Notion block dict."""
    # Blank line → paragraph spacer
    if line.strip() == "":
        return {"object": "block", "type": "paragraph", "paragraph": {"rich_text": []}}

    # Headings
    m = re.match(r"^(#{1,3})\s+(.*)", line)
    if m:
        level = len(m.group(1))
        text = m.group(2).strip()
        block_type = f"heading_{level}"
        return {
            "object": "block",
            "type": block_type,
            block_type: {"rich_text": [{"type": "text", "text": {"content": text}}]},
        }

    # Checkboxes
    m = re.match(r"^- \[(x| )\] (.*)", line, re.IGNORECASE)
    if m:
        checked = m.group(1).lower() == "x"
        text = m.group(2).strip()
        return {
            "object": "block",
            "type": "to_do",
            "to_do": {
                "rich_text": [{"type": "text", "text": {"content": text}}],
                "checked": checked,
            },
        }

    # Plain paragraph
    return {
        "object": "block",
        "type": "paragraph",
        "paragraph": {"rich_text": [{"type": "text", "text": {"content": line}}]},
    }


def md_to_blocks(md: str) -> list[dict]:
    blocks = []
    for line in md.splitlines():
        b = md_line_to_block(line)
        if b:
            blocks.append(b)
    return blocks


# ─────────────────────────── Notion → Markdown ────────────────────────────

def rich_text_to_str(rich_text: list) -> str:
    return "".join(t.get("plain_text", "") for t in rich_text)


def block_to_md_line(block: dict) -> str:
    btype = block.get("type", "")
    data = block.get(btype, {})
    text = rich_text_to_str(data.get("rich_text", []))

    if btype == "heading_1":
        return f"# {text}"
    if btype == "heading_2":
        return f"## {text}"
    if btype == "heading_3":
        return f"### {text}"
    if btype == "to_do":
        mark = "x" if data.get("checked") else " "
        return f"- [{mark}] {text}"
    if btype == "paragraph":
        return text  # empty string for blank spacer blocks
    if btype == "bulleted_list_item":
        return f"- {text}"
    if btype == "numbered_list_item":
        return f"1. {text}"
    # Unsupported block types: skip
    return ""


def blocks_to_md(blocks: list[dict]) -> str:
    lines = [block_to_md_line(b) for b in blocks]
    return "\n".join(lines).strip() + "\n"


# ─────────────────────────── Notion API helpers ───────────────────────────

def get_page_blocks() -> list[dict]:
    """Fetch all blocks from the Notion page (handles pagination)."""
    blocks = []
    url = f"https://api.notion.com/v1/blocks/{NOTION_PAGE_ID}/children"
    params = {"page_size": 100}
    while url:
        r = requests.get(url, headers=HEADERS, params=params)
        r.raise_for_status()
        data = r.json()
        blocks.extend(data.get("results", []))
        url = data.get("next_cursor") and f"https://api.notion.com/v1/blocks/{NOTION_PAGE_ID}/children?start_cursor={data['next_cursor']}"
        params = {}
    return blocks


def delete_all_blocks(blocks: list[dict]) -> None:
    """Delete every block on the page."""
    for block in blocks:
        r = requests.delete(
            f"https://api.notion.com/v1/blocks/{block['id']}",
            headers=HEADERS,
        )
        if r.status_code not in (200, 404):
            r.raise_for_status()


def append_blocks(new_blocks: list[dict]) -> None:
    """Append blocks to the Notion page in batches of 100."""
    for i in range(0, len(new_blocks), 100):
        chunk = new_blocks[i : i + 100]
        r = requests.patch(
            f"https://api.notion.com/v1/blocks/{NOTION_PAGE_ID}/children",
            headers=HEADERS,
            json={"children": chunk},
        )
        r.raise_for_status()


# ─────────────────────────── Main commands ────────────────────────────────

TASKS_FILE = os.environ.get("TASKS_FILE", "tasks.md")


def push():
    """Push tasks.md → Notion."""
    print(f"Reading {TASKS_FILE} ...")
    with open(TASKS_FILE, "r") as f:
        md = f.read()

    new_blocks = md_to_blocks(md)
    print(f"Parsed {len(new_blocks)} blocks from markdown.")

    print("Fetching existing Notion blocks ...")
    existing = get_page_blocks()
    print(f"Deleting {len(existing)} existing blocks ...")
    delete_all_blocks(existing)

    print(f"Appending {len(new_blocks)} new blocks ...")
    append_blocks(new_blocks)
    print("✅ Notion page updated.")


def pull():
    """Pull Notion → tasks.md. Returns True if file changed."""
    print("Fetching Notion blocks ...")
    blocks = get_page_blocks()
    print(f"Got {len(blocks)} blocks.")

    new_md = blocks_to_md(blocks)

    try:
        with open(TASKS_FILE, "r") as f:
            old_md = f.read()
    except FileNotFoundError:
        old_md = ""

    if new_md == old_md:
        print("✅ No changes detected.")
        return False

    with open(TASKS_FILE, "w") as f:
        f.write(new_md)
    print(f"✅ {TASKS_FILE} updated.")
    return True


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "push":
        push()
    elif cmd == "pull":
        changed = pull()
        # Exit code 1 signals to the workflow that a commit is needed
        sys.exit(0 if not changed else 42)
    else:
        print("Usage: sync_notion.py push | pull")
        sys.exit(1)