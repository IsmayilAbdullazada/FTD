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
    const typedLine =
      "Client registration procedures are available at the yellow desk for all visitors.";
    const mixed = pdf([
      Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
      Buffer.from("<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>"),
      Buffer.from(
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>",
      ),
      Buffer.from(
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 750 110] /Resources << /XObject << /Im0 7 0 R >> >> /Contents 8 0 R >>",
      ),
      Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
      stream(
        Buffer.from(
          `BT /F1 10 Tf 30 750 Td (${typedLine}) Tj 0 -20 Td (${typedLine}) Tj ET`,
        ),
      ),
      stream(
        await readFile(image),
        "/Type /XObject /Subtype /Image /Width 1500 /Height 220 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode",
      ),
      stream(Buffer.from("q 750 0 0 110 0 0 cm /Im0 Do Q")),
    ]);
    const hybrid = await read(mixed);
    const hybridText = hybrid.sections.map((s) => s.text).join(" ");
    assert.equal(hybrid.unclear, true);
    assert.match(hybridText, /Client registration procedures/);
    assert.match(hybridText, /visitor lantern/i);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("Markdown headings retain adjacent body text, setext headings and fenced code", () => {
  const result = sections(
    "# Client Registration\nRegister clients at the blue desk.\n1. Open the profile.\n2. Save the document.\n## Code Analysis\nAnalyze code before the creation process.\n\nKnowledge Point\n===\nKeep this reference.\n```md\n# This is code\n```",
    "Upload",
  );
  assert.deepEqual(
    result.map((s) => s.title),
    ["Client Registration", "Code Analysis", "Knowledge Point"],
  );
  assert.match(
    result[0].text,
    /Register clients.*\n1\. Open the profile\.\n2\. Save/s,
  );
  assert.match(result[1].text, /Analyze code/);
  assert.match(result[2].text, /# This is code/);
});
test("HTML and Office preserve inline words, entities, lists and section bodies", async () => {
  const html = await read(
    Buffer.from(
      "<html><body><h1>Client Regis<strong>tration</strong></h1><p>Créate the client pro<b>file</b> &amp; keep the registration document.</p><ol><li>Open the profile.</li><li>Save the document.</li></ol><h2>Code Analysis</h2><p>Analyze the code before the creation process.</p></body></html>",
    ),
  );
  assert.equal(html.sections[0].title, "Client Registration");
  assert.match(html.sections[0].text, /Créate the client profile & keep/);
  assert.match(
    html.sections[0].text,
    /1\. Open the profile\.\n2\. Save the document\./,
  );
  assert.equal(html.sections[1].title, "Code Analysis");
  const odt = new AdmZip();
  odt.addFile(
    "content.xml",
    Buffer.from(
      "<office><text:h>Client Regis<text:span>tration</text:span></text:h><text:p>Create the client pro<text:span>file</text:span> &amp; keep the registration document.</text:p><text:h>Code Analysis</text:h><text:p>Analyze the code before the creation process.</text:p></office>",
    ),
  );
  const parsed = await read(odt.toBuffer());
  assert.equal(parsed.sections[0].title, "Client Registration");
  assert.match(parsed.sections[0].text, /client profile & keep/);
  assert.equal(parsed.sections[1].title, "Code Analysis");
  // Formatting can split a word across Word runs without introducing a space.
  const doc = new AdmZip();
  doc.addFile(
    "[Content_Types].xml",
    Buffer.from(
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    ),
  );
  doc.addFile(
    "_rels/.rels",
    Buffer.from(
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    ),
  );
  doc.addFile(
    "word/document.xml",
    Buffer.from(
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Client Regis</w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>tration</w:t></w:r></w:p><w:p><w:r><w:t>Create the client pro</w:t></w:r><w:r><w:t>file and keep the registration document.</w:t></w:r></w:p></w:body></w:document>',
    ),
  );
  const word = await read(doc.toBuffer());
  assert.equal(word.sections[0].title, "Client Registration");
  assert.match(word.sections[0].text, /client profile and keep/);
});
test("Unicode text and RTF retain characters and the final paragraph", async () => {
  const text =
    "# Client Registration\nCréate the client profile for José García and save the registration document.";
  const utf16 = await read(
    Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, "utf16le")]),
  );
  assert.match(utf16.sections[0].text, /José García/);
  const rtf = await read(
    Buffer.from(
      "{\\rtf1\\ansi\\ansicpg1252 Create the client profile for Jos\\'e9 Garc\\'eda.\\par Save the registration document at the blue desk.}",
    ),
  );
  assert.match(rtf.sections[0].text, /José García/);
  assert.match(rtf.sections[0].text, /Save the registration document/);
  const unicodeRtf = await read(
    Buffer.from(
      "{\\rtf1\\ansi\\uc1 Jos\\u233? Garc\\u237?a should save the registration document at the blue desk.}",
    ),
  );
  assert.match(unicodeRtf.sections[0].text, /José García should save/);
});
test("commas in prose stay documents; quoted CSV/TSV and reversed headers map correctly", async () => {
  const prose = await read(
    Buffer.from(
      "When registering a client, open the profile and check the document.\nBefore saving the document, complete the creation process.",
    ),
    "notes.txt",
  );
  assert.equal(prose.sheets, undefined);
  assert.match(prose.sections[0].text, /complete the creation process/);
  const answer = "Open the profile,\nthen save the registration document.";
  for (const separator of [",", "\t", ";"]) {
    const result = await read(
      Buffer.from(
        [
          '"Clinical response"' + separator + '"Question text"',
          '"' + answer + '"' + separator + '"How do I register a client?"',
        ].join("\n"),
      ),
    );
    assert.equal(result.sheets![0].answerColumn, 0);
    assert.equal(result.sheets![0].questionColumn, 1);
    assert.equal(result.sheets![0].rows[1][0], answer);
  }
});
test("PowerPoint uses presentation order, contiguous runs and linked speaker notes", async () => {
  const deck = new AdmZip();
  deck.addFile(
    "ppt/presentation.xml",
    Buffer.from(
      '<p:presentation xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId r:id="second"/><p:sldId r:id="first"/></p:sldIdLst></p:presentation>',
    ),
  );
  deck.addFile(
    "ppt/_rels/presentation.xml.rels",
    Buffer.from(
      '<Relationships><Relationship Id="first" Target="slides/slide1.xml"/><Relationship Id="second" Target="slides/slide2.xml"/></Relationships>',
    ),
  );
  deck.addFile(
    "ppt/slides/slide1.xml",
    Buffer.from("<a:p><a:r><a:t>Code Analysis</a:t></a:r></a:p>"),
  );
  deck.addFile(
    "ppt/slides/slide2.xml",
    Buffer.from(
      "<a:p><a:r><a:t>Client Regis</a:t></a:r><a:r><a:t>tration</a:t></a:r></a:p>",
    ),
  );
  deck.addFile(
    "ppt/slides/_rels/slide2.xml.rels",
    Buffer.from(
      '<Relationships><Relationship Type="notesSlide" Target="../notesSlides/notesSlide9.xml"/></Relationships>',
    ),
  );
  deck.addFile(
    "ppt/notesSlides/notesSlide9.xml",
    Buffer.from(
      "<a:p><a:t>Create the client profile at the blue desk and save the registration document.</a:t></a:p>",
    ),
  );
  const result = await read(deck.toBuffer());
  assert.equal(result.sections[0].title, "Client Registration");
  assert.match(result.sections[0].text, /Create the client profile/);
  assert.equal(result.sections[1].title, "Code Analysis");
});

test("Markdown containing HTML examples stays a document with its code intact", async () => {
  const result = await read(
    Buffer.from(
      "# Code Analysis\nUse the following example during the creation process.\n\n```html\n<p>Create the client profile.</p>\n```",
    ),
  );
  assert.equal(result.sections[0].title, "Code Analysis");
  assert.match(result.sections[0].text, /<p>Create the client profile\.<\/p>/);
});
