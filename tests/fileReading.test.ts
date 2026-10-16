import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import AdmZip from "adm-zip";
import * as XLSX from "xlsx";
import { readUpload, sections } from "../server/fileReading.ts";
const exec = promisify(execFile);
const content =
  "Collect the visitor lantern from the blue desk beside the entrance.";
async function read(buffer: Buffer, name = "misleading.bin") {
  const dir = await mkdtemp(join(tmpdir(), "read-test-"));
  const path = join(dir, "input");
  await writeFile(path, buffer);
  try {
    return await readUpload(buffer, name, path);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
test("plain text, Markdown, HTML and RTF are identified from content", async () => {
  for (const text of [
    content,
    "# Visitor lantern\n\n" + content,
    "<html><body><h1>Visitor lantern</h1><p>" +
      content +
      "</p><script>do not run this</script></body></html>",
    "{\\rtf1\\ansi " + content + "}",
  ]) {
    const r = await read(Buffer.from(text));
    assert.ok(r.sections.some((s) => s.text.includes(content)));
    assert.ok(!r.sections.some((s) => s.text.includes("do not run this")));
  }
  await assert.rejects(read(Buffer.from("tiny")), /very little/);
});
test("ODT and PowerPoint include readable sections and speaker notes", async () => {
  const odt = new AdmZip();
  odt.addFile(
    "content.xml",
    Buffer.from(`<office><text:p>${content}</text:p></office>`),
  );
  assert.match(
    (await read(odt.toBuffer())).sections[0].text,
    /visitor lantern/,
  );
  const slides = new AdmZip();
  slides.addFile(
    "ppt/slides/slide1.xml",
    Buffer.from(`<a:p><a:t>${content}</a:t></a:p>`),
  );
  slides.addFile(
    "ppt/notesSlides/notesSlide1.xml",
    Buffer.from("<a:t>Keep the lantern upright.</a:t>"),
  );
  const result = await read(slides.toBuffer());
  assert.equal(result.sections.length, 1);
  assert.match(result.sections[0].text, /Keep the lantern upright/);
});
test("Word DOCX extracts text without running document content", async () => {
  const doc = new AdmZip();
  doc.addFile(
    "[Content_Types].xml",
    Buffer.from(
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    ),
  );
  doc.addFile(
    "_rels/.rels",
    Buffer.from(
      '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    ),
  );
  doc.addFile(
    "word/document.xml",
    Buffer.from(
      `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${content}</w:t></w:r></w:p></w:body></w:document>`,
    ),
  );
  assert.match(
    (await read(doc.toBuffer())).sections[0].text,
    /visitor lantern/,
  );
});
test("Excel XLS/XLSX, CSV and TSV detect question/answer columns", async () => {
  const rows = [
    ["Question", "Answer"],
    ["Where is the lantern?", content],
  ];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet(rows),
    "Questions",
  );
  for (const type of ["xls", "xlsx"] as const) {
    const r = await read(XLSX.write(book, { type: "buffer", bookType: type }));
    assert.equal(r.sheets?.[0].answerColumn, 1);
    assert.equal(r.sheets?.[0].rows[1][1], content);
  }
  for (const separator of [",", "\t"]) {
    const r = await read(
      Buffer.from(rows.map((r) => r.join(separator)).join("\n")),
    );
    assert.equal(r.sheets?.[0].questionColumn, 0);
  }
});
test("photos and multipage TIFFs read text and require human double-check", async () => {
  const dir = await mkdtemp(join(tmpdir(), "photo-test-"));
  try {
    const png = join(dir, "photo.png");
    await exec("convert", [
      "-size",
      "1500x220",
      "xc:white",
      "-font",
      "DejaVu-Sans",
      "-pointsize",
      "34",
      "-fill",
      "black",
      "-annotate",
      "+20+80",
      content,
      png,
    ]);
    for (const ext of ["png", "jpg", "tiff"]) {
      const file = join(dir, `test.${ext}`);
      await exec("convert", ext === "tiff" ? [png, png, file] : [png, file]);
      const result = await read(await readFile(file));
      assert.equal(result.unclear, true);
      assert.match(
        result.sections.map((s) => s.text).join(" "),
        /visitor lantern/i,
      );
      if (ext === "tiff")
        assert.ok(
          result.sections
            .map((s) => s.text)
            .join(" ")
            .match(/visitor lantern/gi)!.length >= 2,
        );
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("sections respect headings and do not cut a numbered list", () => {
  const list = Array.from(
    { length: 80 },
    (_, i) => `${i + 1}. Keep all these numbered steps together.`,
  ).join("\n");
  const result = sections(
    "# First topic\n\n" +
      "Words here. ".repeat(180) +
      "\n\n" +
      list +
      "\n\n# Second topic\n\n" +
      content,
    "Guide",
  );
  assert.ok(result.some((s) => s.text.includes(list)));
  assert.equal(result.at(-1)!.title, "Second topic");
});

function pdf(objects: Buffer[]) {
  const parts = [Buffer.from("%PDF-1.4\n")];
  const offsets = [0];
  let length = parts[0].length;
  objects.forEach((o, i) => {
    offsets.push(length);
    const object = Buffer.concat([
      Buffer.from(`${i + 1} 0 obj\n`),
      o,
      Buffer.from("\nendobj\n"),
    ]);
    parts.push(object);
    length += object.length;
  });
  parts.push(
    Buffer.from(
      `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
        .slice(1)
        .map((n) => String(n).padStart(10, "0") + " 00000 n \n")
        .join(
          "",
        )}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`,
    ),
  );
  return Buffer.concat(parts);
}
function stream(data: Buffer, attributes = "") {
  return Buffer.concat([
    Buffer.from(`<< ${attributes} /Length ${data.length} >>\nstream\n`),
    data,
    Buffer.from("\nendstream"),
  ]);
}
test("typed and scanned PDFs read text; overlong PDFs are politely refused", async () => {
  const typed = (pages = 1) =>
    pdf([
      Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
      Buffer.from(
        `<< /Type /Pages /Kids [${Array.from({ length: pages }, (_, i) => `${i + 3} 0 R`).join(" ")}] /Count ${pages} >>`,
      ),
      ...Array.from({ length: pages }, () =>
        Buffer.from(
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${pages + 3} 0 R >> >> /Contents ${pages + 4} 0 R >>`,
        ),
      ),
      Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
      stream(Buffer.from(`BT /F1 12 Tf 30 750 Td (${content}) Tj ET`)),
    ]);
  const text = await read(typed());
  assert.match(text.sections[0].text, /visitor lantern/);
  assert.equal(text.unclear, false);
  await assert.rejects(read(typed(301)), /300 pages/);
  const dir = await mkdtemp(join(tmpdir(), "pdf-scan-"));
  try {
    const image = join(dir, "page.jpg");
    await exec("convert", [
      "-size",
      "1500x220",
      "xc:white",
      "-font",
      "DejaVu-Sans",
      "-pointsize",
      "34",
      "-fill",
      "black",
      "-annotate",
      "+20+80",
      content,
      image,
    ]);
    const scanned = pdf([
      Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
      Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
      Buffer.from(
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 750 110] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>",
      ),
      stream(
        await readFile(image),
        "/Type /XObject /Subtype /Image /Width 1500 /Height 220 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode",
      ),
      stream(Buffer.from("q 750 0 0 110 0 0 cm /Im0 Do Q")),
    ]);
    const result = await read(scanned);
    assert.equal(result.unclear, true);
    assert.match(result.sections[0].text, /visitor lantern/i);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
