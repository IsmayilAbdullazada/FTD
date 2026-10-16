import { fileTypeFromBuffer } from "file-type";
import AdmZip from "adm-zip";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, posix } from "node:path";
import {
  htmlText,
  officeText,
  rtfText,
  decodeText,
  xmlDocument,
  tidy,
} from "./documentText.ts";
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
export function sections(text: string, title: string) {
  const out: { title: string; text: string }[] = [];
  let heading = title;
  let paragraphs: string[] = [];
  let count = 0;
  const flush = () => {
    const body = tidy(paragraphs.join("\n\n"));
    if (body) out.push({ title: heading, text: body });
    paragraphs = [];
    count = 0;
  };
  // Isolate headings line by line before grouping paragraphs: a heading need not
  // have a blank line between it and its body. Fenced code is never a heading.
  const lines = tidy(text).split("\n");
  let fenced = false;
  let paragraph: string[] = [];
  const addParagraph = () => {
    const p = paragraph.join("\n").trim();
    if (p) {
      const words = p.split(/\s+/).length;
      if (
        count >= 300 &&
        count + words > 800 &&
        !/^\s*(?:\d+[.)]|[-*+])\s/.test(p)
      ) {
        flush();
        heading += " — continued";
      }
      paragraphs.push(p);
      count += words;
    }
    paragraph = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const atx = !fenced && line.match(/^ {0,3}#{1,6}\s+(.+?)(?:\s+#+)?$/);
    const setext =
      !fenced &&
      line.trim() &&
      /^ {0,3}(?:={3,}|-{3,})\s*$/.test(lines[i + 1] || "");
    if (atx || setext) {
      addParagraph();
      flush();
      heading = atx ? atx[1].trim() : line.trim();
      if (setext) i++;
    } else if (!line.trim()) addParagraph();
    else paragraph.push(line);
  }
  addParagraph();
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
        text = htmlText(
          (
            await mammoth.convertToHtml(
              { buffer },
              {
                convertImage: mammoth.images.imgElement(async () => ({
                  src: "",
                })),
              },
            )
          ).value,
        );
      } else if (zip.getEntry("content.xml"))
        text = officeText(zip.readAsText("content.xml"));
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
        // A presentation can display slide files in a different order to their filenames.
        if (
          zip.getEntry("ppt/presentation.xml") &&
          zip.getEntry("ppt/_rels/presentation.xml.rels")
        ) {
          const rels = xmlDocument(
            zip.readAsText("ppt/_rels/presentation.xml.rels"),
          );
          const targets = new Map(
            Array.from(rels.getElementsByTagName("Relationship")).map((r) => [
              r.getAttribute("Id"),
              posix.normalize(
                posix.join("ppt", r.getAttribute("Target") || ""),
              ),
            ]),
          );
          const order = Array.from(
            xmlDocument(
              zip.readAsText("ppt/presentation.xml"),
            ).getElementsByTagName("p:sldId"),
          ).map((n) => targets.get(n.getAttribute("r:id")));
          if (order.length)
            slides.sort(
              (a, b) => order.indexOf(a.entryName) - order.indexOf(b.entryName),
            );
        }
        return {
          mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          unclear: false,
          sections: slides.map((e, i) => {
            const n = e.entryName.match(/slide(\d+)/)![1];
            const rels = zip.getEntry(`ppt/slides/_rels/slide${n}.xml.rels`);
            const noteTarget =
              rels &&
              Array.from(
                xmlDocument(rels.getData().toString()).getElementsByTagName(
                  "Relationship",
                ),
              )
                .find((r) =>
                  /notesSlide/.test(
                    r.getAttribute("Type") || r.getAttribute("Target") || "",
                  ),
                )
                ?.getAttribute("Target");
            const notePath = noteTarget
              ? posix.normalize(posix.join("ppt/slides", noteTarget))
              : `ppt/notesSlides/notesSlide${n}.xml`;
            const notes = zip.getEntry(notePath);
            const body = officeText(e.getData().toString(), true);
            return {
              title:
                body.split("\n")[0]?.trim().slice(0, 120) ||
                `${name} — Slide ${i + 1}`,
              text:
                body +
                (notes
                  ? "\n\nSpeaker notes:\n" +
                    officeText(notes.getData().toString(), true)
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
      const extracted = text.split("\f");
      const pageTexts: string[] = [];
      for (let page = 1; page <= pages; page++) {
        const typed = extracted[page - 1] || "";
        // Detect sparse/image pages individually, including mixed typed/scanned PDFs.
        if ((typed.match(/\p{L}/gu) || []).length >= 30) {
          pageTexts.push(typed);
          continue;
        }
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
            "2500",
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
        if (typed.trim() || result.stdout.trim()) unclear = true;
        // OCR includes any sparse typed header too; avoid duplicating it.
        pageTexts.push(
          result.stdout.trim().length > typed.trim().length
            ? result.stdout
            : typed,
        );
      }
      text = pageTexts.join("\n\n");
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
      text = decodeText(buffer);
      if (text.trimStart().startsWith("{\\rtf")) {
        text = await rtfText(text);
        mime = "application/rtf";
      } else if (
        /^\s*(?:<!doctype[^>]*>\s*)?<(?:html|body|head|p|div|table|h[1-6])(?:\s|>)[\s\S]*<\//i.test(
          text,
        )
      ) {
        text = htmlText(text);
        mime = "text/html";
      } else if (isDelimited(text, name)) {
        return {
          ...sheets(text),
          mime: text.includes("\t") ? "text/tab-separated-values" : "text/csv",
        };
      }
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
        ? firstLine.replace(/^#{1,6}\s+/, "")
        : name.replace(/\.[^.]+$/, "");
    return { mime, unclear, sections: sections(text, title) };
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
function isDelimited(text: string, name: string) {
  // Parse quoted cells before deciding; commas in ordinary prose are not a spreadsheet.
  for (const delimiter of ["\t", ",", ";"]) {
    if (!text.includes(delimiter)) continue;
    const book = XLSX.read(text, { type: "string", FS: delimiter, raw: true });
    const rows = XLSX.utils
      .sheet_to_json<string[]>(book.Sheets[book.SheetNames[0]], {
        header: 1,
        raw: true,
      })
      .filter((r) => r.some((c) => String(c).trim()));
    if (rows.length < 2) continue;
    const head = rows
      .slice(0, 10)
      .find((row) => row.some(isQuestion) && row.some(isAnswer));
    const consistent =
      rows.every((row) => row.length === rows[0].length) && rows[0].length >= 2;
    if (
      head ||
      (consistent && (delimiter === "\t" || /\.(csv|tsv)$/i.test(name)))
    )
      return true;
  }
  return false;
}
const isQuestion = (value: unknown) =>
  /^(?:q|question(?:s| text)?|prompt|inquiry|query|user question)$/i.test(
    String(value).trim(),
  );
const isAnswer = (value: unknown) =>
  /^(?:a|answer(?:s| text)?|response|clinical (?:answer|response)|reply|guidance)$/i.test(
    String(value).trim(),
  );
function sheets(buffer: Buffer | string): ReadResult {
  let book: XLSX.WorkBook;
  try {
    book = XLSX.read(buffer, {
      type: typeof buffer === "string" ? "string" : "buffer",
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
          rows
            .slice(0, 20)
            .findIndex((row) => row.some(isQuestion) && row.some(isAnswer)),
        );
        const head = rows[headerRow] || [];
        const questionColumn = Math.max(0, head.findIndex(isQuestion));
        const foundAnswer = head.findIndex(isAnswer);
        return {
          name,
          rows,
          headerRow,
          questionColumn,
          answerColumn:
            foundAnswer >= 0 && foundAnswer !== questionColumn
              ? foundAnswer
              : questionColumn === 0
                ? 1
                : 0,
        };
      })
      .filter((s) => s.rows.some((r) => r.some((c) => c.trim()))),
  };
}
