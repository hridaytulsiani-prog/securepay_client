"""Builds the downloadable plugin zip served from the merchant Settings page.

Run from anywhere:  python wordpress-plugin/build.py
Output: public/downloads/escrosafe-for-wordpress.zip
WordPress needs the zip to contain one top-level folder named after the plugin.
"""
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "escrosafe-for-woocommerce"
OUT = HERE.parent / "public" / "downloads" / "escrosafe-for-wordpress.zip"

OUT.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(SRC.rglob("*")):
        if path.is_file():
            archive.write(path, f"{SRC.name}/{path.relative_to(SRC).as_posix()}")

print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")
