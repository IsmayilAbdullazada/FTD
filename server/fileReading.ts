import { fileTypeFromBuffer } from "file-type";
import AdmZip from "adm-zip";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const exec = promisify(execFile);
export interface ReadResult {
  sections: { title: string; text: string }[];
  unclear: boolean;
  sheets?: {
    name: string;
    rows: string[][];
    questionColumn: number;
    answerColumn: number;
    headerRow: number;
  }[];
}
const strip = (s: string) =>
  s
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/(?:p|div|h[1-6]|text:p|text:h)>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
export function sections(text: string, title: string) {
  const out: { title: string; text: string }[] = [];
  let heading = title;
  let paragraphs: string[] = [];
  let count = 0;
  const flush = () => {
    if (paragraphs.join("\n\n").trim())
      out.push({ title: heading, text: paragraphs.join("\n\n").trim() });
    paragraphs = [];
    count = 0;
  };
  for (const p of text.split(/\n\s*\n/)) {
    if (/^#{1,6}\s/.test(p.trim())) {
      flush();
      heading = p.replace(/^#+\s*/, "").trim();
      continue;
    }
    // A numbered list remains a single paragraph and is never cut in half.
    const words = p.split(/\s+/).length;
    if (count >= 300 && count + words > 800 && !/^\s*\d+[.)]/.test(p)) {
      flush();
      heading = title + " — continued";
    }
    paragraphs.push(p);
    count += words;
  }
  flush();
  return out;
}
export async function readUpload(
  buffer: Buffer,
  name: string,
  path: string,
): Promise<ReadResult & { mime: string }> {
  const type = await fileTypeFromBuffer(buffer);
  let mime = type?.mime || "text/plain";
  let text = "";
  let unclear = false;
  const temp = await mkdtemp(join(tmpdir(), "clinic-read-"));
  try {
    // ZIP entries are inspected before decompression; reject macros, encryption and oversized expansion.
    if (buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
      const zip = new AdmZip(buffer);
      const entries = zip.getEntries();
      if (
        entries.length > 5000 ||
        entries.reduce((n, e) => n + e.header.size, 0) > 100 * 1024 * 1024
      )
        throw Error(
          "This file is too large to read safely. Please divide it into smaller files.",
        );
      if (
        entries.some((e) => /vbaProject|macros\/|Scripts\//i.test(e.entryName))
      )
        throw Error(
          "This file contains macros. Save a copy without macros and upload again.",
        );
      if (entries.some((e) => (e.header.flags & 1) !== 0))
        throw Error(
          "This file has a password. Please remove it and upload again.",
        );
      if (
        zip.getEntry("META-INF/manifest.xml") &&
        /encryption-data/.test(zip.readAsText("META-INF/manifest.xml"))
      )
        throw Error(
          "This file has a password. Please remove it and upload again.",
        );
      if (zip.getEntry("xl/workbook.xml"))
        return {
          ...sheets(buffer),
          mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        };
      if (zip.getEntry("word/document.xml")) {
        text = (await mammoth.extractRawText({ buffer })).value;
        const paragraphs =
          zip
            .readAsText("word/document.xml")
            .match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
        for (const p of paragraphs.filter((p) =>
          /<w:pStyle[^>]+w:val=["'](?:Heading|Title)/i.test(p),
        )) {
          const heading = strip(p);
          if (heading)
            text = text.replace(heading, "\n\n# " + heading + "\n\n");
        }
      } else if (zip.getEntry("content.xml"))
        text = strip(
          zip.readAsText("content.xml").replace(/<text:h[^>]*>/g, "\n\n# "),
        );
      else if (
        entries.some((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
      ) {
        const slides = entries
          .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
          .sort((a, b) =>
            a.entryName.localeCompare(b.entryName, undefined, {
              numeric: true,
            }),
          );
        return {
          mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          unclear: false,
          sections: slides.map((e, i) => {
            const n = e.entryName.match(/slide(\d+)/)![1];
            const rels = zip.getEntry(`ppt/slides/_rels/slide${n}.xml.rels`);
            const noteTarget = rels
              ?.getData()
              .toString()
              .match(/Target=["']([^"']*notesSlide[^"']+)["']/)?.[1];
            const notePath = noteTarget
              ? "ppt/" + noteTarget.replace(/^\.\.\//, "")
              : `ppt/notesSlides/notesSlide${n}.xml`;
            const notes = zip.getEntry(notePath);
            return {
              title: `${name} — Slide ${i + 1}`,
              text:
                strip(e.getData().toString()) +
                (notes
                  ? "\n\nSpeaker notes:\n" + strip(notes.getData().toString())
                  : ""),
            };
          }),
        };
      } else
        throw Error(
          "This kind of file cannot be read. Save it as a document or plain text and try again.",
        );
    } else if (type?.ext === "pdf") {
      const info = await exec("pdfinfo", [path], { timeout: 30000 }).catch(
        () => {
          throw Error(
            "This PDF could not be opened. If it has a password, remove it and upload again.",
          );
        },
      );
      if (/Encrypted:\s+yes/i.test(info.stdout))
        throw Error(
          "This file has a password. Please remove it and upload again.",
        );
      const pages = Number(info.stdout.match(/Pages:\s+(\d+)/)?.[1]);
      if (!pages || pages > 300)
        throw Error("Please upload a PDF with no more than 300 pages.");
      const output = join(temp, "text.txt");
      await exec("pdftotext", ["-layout", path, output], { timeout: 60000 });
      text = await readFile(output, "utf8");
      if (text.replace(/\s/g, "").length < pages * 40) {
        unclear = true;
        text = "";
        for (let page = 1; page <= pages; page++) {
          const prefix = join(temp, `page-${page}`);
          await exec(
            "pdftoppm",
            [
              "-f",
              String(page),
              "-l",
              String(page),
              "-singlefile",
              "-scale-to",
              "2000",
              "-png",
              path,
              prefix,
            ],
            { timeout: 60000 },
          );
          const result = await exec("tesseract", [prefix + ".png", "stdout"], {
            timeout: 60000,
            maxBuffer: 10 * 1024 * 1024,
          });
          text += result.stdout + "\n\n";
        }
      }
    } else if (type?.mime.startsWith("image/")) {
      unclear = true;
      const pages =
        type.ext === "tif" || type.ext === "tiff"
          ? Number(
              (
                await exec("identify", ["-format", "%n\n", path], {
                  timeout: 30000,
                })
              ).stdout.split("\n")[0],
            )
          : 1;
      if (!Number.isFinite(pages) || pages > 300)
        throw Error(
          "Please divide this photo document into files with no more than 300 pages.",
        );
      for (let page = 0; page < pages; page++) {
        const image = join(temp, `page-${page}.png`);
        await exec(
          "convert",
          [path + `[${page}]`, "-auto-orient", "-resize", "3000x3000>", image],
          { timeout: 60000 },
        );
        text +=
          (
            await exec("tesseract", [image, "stdout"], {
              timeout: 60000,
              maxBuffer: 10 * 1024 * 1024,
            })
          ).stdout + "\n\n";
      }
    } else if (type?.ext === "cfb") {
      if (
        buffer.includes(Buffer.from("VBA", "utf16le")) ||
        buffer.includes(Buffer.from("_VBA_PROJECT"))
      )
        throw Error(
          "This file contains macros. Save a copy without macros and upload again.",
        );
      if (
        buffer.includes(Buffer.from("EncryptedPackage", "utf16le")) ||
        buffer.includes(Buffer.from("EncryptionInfo", "utf16le"))
      )
        throw Error(
          "This file has a password. Please remove it and upload again.",
        );
      if (
        buffer.includes(Buffer.from("Workbook", "utf16le")) ||
        buffer.includes(Buffer.from("Book", "utf16le"))
      )
        return { ...sheets(buffer), mime: "application/vnd.ms-excel" };
      const { default: WordExtractor } = await import("word-extractor");
      text = (await new WordExtractor().extract(buffer)).getBody();
    } else if (!type || type.ext === "rtf") {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      if (text.includes("\0"))
        throw Error(
          "This file cannot be read. Save it as plain text and upload again.",
        );
      if (text.startsWith("{\\rtf"))
        text = text
          .replace(/\\'[0-9a-f]{2}/gi, " ")
          .replace(/\\(?:par|line)\b/g, "\n")
          .replace(/\\[a-z]+-?\d* ?/gi, "")
          .replace(/[{}]/g, "");
      else if (/<html|<!doctype|<body|<h[1-6][ >]/i.test(text))
        text = strip(text.replace(/<h[1-6][^>]*>/gi, "\n\n# "));
      else if (
        text.split("\n").filter((l) => l.includes("\t") || l.includes(","))
          .length >= 2
      )
        return { ...sheets(buffer), mime: "text/csv" };
    } else
      throw Error(
        "This kind of file cannot be read. Please save it as PDF, Word, or plain text and try again.",
      );
    if (text.trim().length < 30)
      throw Error(
        "We could read very little of this file. Try clearer photos, or type or paste it instead.",
      );
    const firstLine = text.trim().split("\n")[0].trim();
    const title =
      firstLine.length < 120 && firstLine.split(/\s+/).length < 15
        ? firstLine
        : name;
    return { mime, unclear, sections: sections(text, title) };
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
function sheets(buffer: Buffer): ReadResult {
  let book: XLSX.WorkBook;
  try {
    book = XLSX.read(buffer, {
      type: "buffer",
      cellDates: true,
      bookVBA: true,
    });
  } catch {
    throw Error(
      "This spreadsheet could not be opened. Remove any password and upload again.",
    );
  }
  if (book.vbaraw)
    throw Error(
      "This file contains macros. Save a copy without macros and upload again.",
    );
  const visible = book.SheetNames.filter(
    (name, i) => !book.Workbook?.Sheets?.[i]?.Hidden,
  );
  return {
    sections: [],
    unclear: false,
    sheets: visible
      .map((name) => {
        const rows = XLSX.utils
          .sheet_to_json<string[]>(book.Sheets[name], {
            header: 1,
            defval: "",
            raw: false,
          })
          .map((row) => row.map(String));
        const headerRow = Math.max(
          0,
          rows.findIndex((row) =>
            row.some((c) => /^(question|questions|prompt)$/i.test(c.trim())),
          ),
        );
        const head = rows[headerRow] || [];
        return {
          name,
          rows,
          headerRow,
          questionColumn: Math.max(
            0,
            head.findIndex((c) => /question|prompt/i.test(c)),
          ),
          answerColumn: Math.max(
            1,
            head.findIndex((c) => /answer|response/i.test(c)),
          ),
        };
      })
      .filter((s) => s.rows.some((r) => r.some((c) => c.trim()))),
  };
}
