"""Checks every paste-ready field in docs/PLAY_STORE_LISTING.md against Google Play's character limits.

Each field is a ```text block under a heading that ends with its limit in brackets, e.g. "### App name (30)".
"""
import re
import sys
from pathlib import Path

doc = (Path(__file__).resolve().parent.parent / 'docs/PLAY_STORE_LISTING.md').read_text()
bad = 0
for head, limit, body in re.findall(r'^###[ ]+([^\n]+?)[ ]+\((\d+)\)\s*\n```text\n(.*?)\n```', doc, re.M | re.S):
    n, ok = len(body), len(body) <= int(limit)
    bad += not ok
    print(f"{'ok ' if ok else 'TOO LONG'} {n:>5}/{limit:<5} {head}")
sys.exit(1 if bad else 0)
