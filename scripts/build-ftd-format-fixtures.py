"""Convert a public FTD excerpt into real file formats; never count these as originals.
Requires: PyMuPDF, python-docx, python-pptx, Pillow, reportlab, pillow-heif,
LibreOffice and the project's installed xlsx package.
python3 scripts/build-ftd-format-fixtures.py original-manifest.json destination
"""

from pathlib import Path
import sys, json, re, hashlib, subprocess, io, html, csv, urllib.request
import fitz
from PIL import Image
from docx import Document
from pptx import Presentation
from pptx.util import Inches
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import simpleSplit

manifest = json.loads(Path(sys.argv[1]).read_text())
out = Path(sys.argv[2]).resolve()
out.mkdir(parents=True, exist_ok=True)
source = next(r for r in manifest["files"] if r["id"] == "ftd-33")
if source.get("referencePath") and Path(source["referencePath"]).exists():
    text = Path(source["referencePath"]).read_text()
else:
    raw = urllib.request.urlopen(source["url"], timeout=30).read()
    if hashlib.sha256(raw).hexdigest() != source["sha256"]:
        raise RuntimeError("Original source checksum changed")
    text = raw.decode("utf-8")
text = text[text.index("Frontotemporal dementia affects") :].split("\n\n")[0].strip()
title = "Frontotemporal dementia"
paragraphs = text.splitlines()
font = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
pdfmetrics.registerFont(TTFont("AuditFont", font))
(out / "ftd.txt").write_text(text)
(out / "ftd.md").write_text("# " + title + "\n\n" + text)
(out / "ftd.markdown").write_bytes((out / "ftd.md").read_bytes())
markup = (
    "<html><head><title>FTD format test</title></head><body><nav>Benchmark navigation</nav><main><h1>"
    + title
    + "</h1>"
    + "".join("<p>" + html.escape(p) + "</p>" for p in paragraphs)
    + "</main><footer>Benchmark footer</footer></body></html>"
)
for ext in ["html", "htm"]:
    (out / ("ftd." + ext)).write_text(markup)
doc = Document()
doc.add_heading(title, 0)
for p in paragraphs:
    doc.add_paragraph(p)
doc.save(out / "ftd.docx")
for ext in ["doc", "rtf", "odt"]:
    subprocess.run(
        [
            "soffice",
            "-env:UserInstallation=file://" + str(out / ("lo-profile-" + ext)),
            "--headless",
            "--convert-to",
            ext,
            "--outdir",
            str(out),
            str(out / "ftd.docx"),
        ],
        check=True,
        timeout=90,
        capture_output=True,
    )
    if not (out / ("ftd." + ext)).exists():
        raise RuntimeError("LibreOffice did not create " + ext)
pres = Presentation()
for i, p in enumerate(paragraphs):
    slide = pres.slides.add_slide(pres.slide_layouts[1])
    slide.shapes.title.text = title if i == 0 else title + " — continued"
    slide.placeholders[1].text = p
pres.save(out / "ftd.pptx")
c = canvas.Canvas(str(out / "ftd.pdf"))
c.setTitle(title)
c.setFont("AuditFont", 16)
c.drawString(40, 800, title)
c.setFont("AuditFont", 11)
y = 770
for p in paragraphs:
    for line in simpleSplit(p, "AuditFont", 11, 515):
        c.drawString(40, y, line)
        y -= 17
    y -= 10
c.save()
pdf = fitz.open(out / "ftd.pdf")
pix = pdf[0].get_pixmap(matrix=fitz.Matrix(2, 2))
pix.save(str(out / "ftd.png"))
image = Image.open(out / "ftd.png").convert("RGB")
for ext in ["jpg", "jpeg", "tif", "tiff", "bmp", "webp", "gif"]:
    image.save(out / ("ftd." + ext))
import pillow_heif

pillow_heif.register_heif_opener()
for ext in ["heic", "heif"]:
    image.save(out / ("ftd." + ext), format="HEIF", quality=90)
# Include scanned-only and mixed PDFs as separate layout cases.
scanned = fitz.open()
page = scanned.new_page(width=pdf[0].rect.width, height=pdf[0].rect.height)
page.insert_image(page.rect, filename=str(out / "ftd.png"))
scanned.save(out / "ftd-scanned.pdf")
mixed = fitz.open()
mixed.insert_pdf(pdf)
mixed.insert_pdf(scanned)
mixed.save(out / "ftd-mixed.pdf")
# Keep genuine Q&A sheets separate from generic research tables in the originals.
qa = [["Question", "Answer"]] + [
    [f"What does the source say in paragraph {i+1}?", p]
    for i, p in enumerate(paragraphs)
]
for ext, sep in [("csv", ","), ("tsv", "\t")]:
    with (out / ("ftd." + ext)).open("w", newline="") as f:
        csv.writer(f, delimiter=sep).writerows(qa)
(out / "rows.json").write_text(json.dumps(qa))
js = """import fs from 'node:fs';import * as XLSX from 'xlsx';const root=process.argv[2];const rows=JSON.parse(fs.readFileSync(root+'/rows.json'));for(const ext of ['xlsx','xls']){const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(rows),'FTD questions');XLSX.writeFile(book,root+'/ftd.'+ext,{bookType:ext});}"""
subprocess.run(
    ["node", "--input-type=module", "-", str(out)],
    input=js,
    text=True,
    check=True,
    timeout=30,
)
anchors = []
for p in paragraphs:
    words = list(
        dict.fromkeys(
            w.lower()
            for w in re.findall(r"[A-Za-z][A-Za-z-]+", p)
            if len(w) > 4
            and w.lower()
            not in ["frontotemporal", "dementia", "which", "their", "those", "these"]
        )
    )
    anchors.append(
        {
            "query": " ".join(words[:6]),
            "referenceExcerpt": p,
            "kind": "converted public-source reference diagnostic",
        }
    )
files = []
for i, p in enumerate(sorted(out.glob("ftd.*")), 1):
    if p.suffix == ".json":
        continue
    files.append(
        {
            "id": f"format-{i:02d}",
            "name": p.name,
            "path": str(p),
            "url": source["url"],
            "extension": p.suffix[1:],
            "sha256": hashlib.sha256(p.read_bytes()).hexdigest(),
            "kind": "converted-from-internet-original",
            "parentId": source["id"],
            "referenceWords": len(text.split()),
            "anchors": anchors,
        }
    )
for name in ["ftd-scanned.pdf", "ftd-mixed.pdf"]:
    p = out / name
    files.append(
        {
            "id": "format-" + name.split(".")[0],
            "name": name,
            "path": str(p),
            "url": source["url"],
            "extension": "pdf",
            "sha256": hashlib.sha256(p.read_bytes()).hexdigest(),
            "kind": "converted-from-internet-original",
            "parentId": source["id"],
            "referenceWords": len(text.split()),
            "anchors": anchors,
        }
    )
(out / "manifest.json").write_text(
    json.dumps(
        {
            "seed": 20261016,
            "sampling": "Controlled conversions of the same verbatim public FTD excerpt. These are format-coverage checks, not independent internet originals.",
            "discoveryLimit": "Original .doc/.xls/.xlsx/.rtf/.odt/.heic and other rare formats were not obtained from reachable public FTD sites.",
            "files": files,
        },
        indent=2,
    )
)
print("Created", len(files), "real format fixtures:", [r["name"] for r in files])
