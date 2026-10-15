"""Render the mocks to PNG with Playwright (python). Usage: python3 render.py  (run from this folder; fonts in ../fonts)."""
import pathlib
from playwright.sync_api import sync_playwright
here = pathlib.Path(__file__).resolve().parent
jobs = [("story-board.html", 1920, 1080, "story-board-1920x1080.png"), ("ipad.html", 2048, 1536, "ipad-2048x1536.png"), ("moodboard.html", 2400, 1320, "../moodboard.png")]
with sync_playwright() as p:
    b = p.chromium.launch(args=["--allow-file-access-from-files"])
    for src, w, h, out in jobs:
        if not (here / src).exists(): continue
        pg = b.new_page(viewport={"width": w, "height": h})
        pg.goto((here / src).as_uri()); pg.evaluate("document.fonts.ready"); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(2000)
        pg.screenshot(path=str(here / out)); pg.close(); print("wrote", out)
    b.close()
