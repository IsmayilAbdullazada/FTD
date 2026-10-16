import { fileTypeFromBuffer } from "file-type";
import AdmZip from "adm-zip";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import CFB from "cfb";
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
  title?: string;
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
export const fileTitle = (name: string) =>
  name
    .replace(/\.[^.]+$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
export function sections(text: string, title: string) {
  const out: { title: string; text: string }[] = [];
  let heading = title,
    part = 0,
    count = 0;
  let paragraphs: string[] = [];
  const flush = () => {
    const body = tidy(paragraphs.join("\n\n"));
    if (body) {
      out.push({
        title: heading + (part ? ` — Part ${part + 1}` : ""),
        text: body,
      });
      part++;
    }
    paragraphs = [];
    count = 0;
  };
  const addParagraph = (paragraph: string[]) => {
    const p = paragraph.join("\n").trim();
    if (!p) return;
    const words = p.match(/\S+(?:\s+|$)/g) || [];
    if (words.length > 800) {
      flush();
      // Preserve exact text inside each piece, including line breaks and tables.
      // A normal numbered list remains intact; even a huge paragraph is bounded.
      for (let i = 0; i < words.length; i += 750) {
        paragraphs.push(words.slice(i, i + 750).join(""));
        count = Math.min(750, words.length - i);
        if (i + 750 < words.length) flush();
      }
    } else {
      if (count && count + words.length > 800) flush();
      paragraphs.push(p);
      count += words.length;
    }
  };
  const lines = tidy(text).split("\n");
  let fence = "",
    paragraph: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length)
        fence = "";
      paragraph.push(line);
      continue;
    }
    const atx = !fence && line.match(/^ {0,3}#{1,6}\s+(.+?)(?:\s+#+)?$/);
    const setext =
      !fence &&
      line.trim() &&
      /^ {0,3}(?:={3,}|-{3,})\s*$/.test(lines[i + 1] || "");
    if (atx || setext) {
      addParagraph(paragraph);
      paragraph = [];
      flush();
      heading = atx ? atx[1].trim() : line.trim();
      part = 0;
      if (setext) i++;
    } else if (!line.trim()) {
      addParagraph(paragraph);
      paragraph = [];
    } else paragraph.push(line);
  }
  addParagraph(paragraph);
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
  let documentTitle = fileTitle(name);
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
          ...sheets(buffer, name),
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
          title: documentTitle,
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
      const metadataTitle = info.stdout.match(/^Title:\s*(.+)$/m)?.[1]?.trim();
      if (
        metadataTitle &&
        metadataTitle.length > 8 &&
        !/^(?:doi:|https?:|untitled|microsoft|\(unspecified\))/i.test(
          metadataTitle,
        )
      )
        documentTitle = metadataTitle
          .replace(/\.(?:pdf|docx?|pptx?|md)$/i, "")
          .replace(/_/g, " ");
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
        // Older PDF font maps can turn fi/fl/ff ligatures into W/X/Y while
        // still producing plenty of apparent text. Recover these pages with OCR.
        const brokenGlyphs = typed.match(/\b[a-z]+[WXY][a-z]+\b/g) || [];
        const brokenEncoding =
          brokenGlyphs.length >= 5 && new Set(brokenGlyphs).size >= 2;
        if ((typed.match(/\p{L}/gu) || []).length >= 30 && !brokenEncoding) {
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
          (brokenEncoding && result.stdout.trim()) ||
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
      // Inspect compound-file directory entries, not arbitrary bytes in document
      // text or styles (e.g. Book Title must never make a Word file an Excel file).
      const container = CFB.read(buffer, { type: "buffer" });
      const names = container.FullPaths.filter((path) =>
        /^[^/]+\/[^/]+$/.test(path),
      ).map((path) => path.split("/").at(-1)!);
      if (
        container.FullPaths.some((path) =>
          /(?:^|\/)(?:VBA|_VBA_PROJECT)(?:\/|$)/i.test(path),
        )
      )
        throw Error(
          "This file contains macros. Save a copy without macros and upload again.",
        );
      if (
        names.some((entry) =>
          /^(EncryptedPackage|EncryptionInfo)$/i.test(entry),
        )
      )
        throw Error(
          "This file has a password. Please remove it and upload again.",
        );
      if (names.some((entry) => /^(Workbook|Book)$/i.test(entry)))
        return { ...sheets(buffer, name), mime: "application/vnd.ms-excel" };
      if (!names.includes("WordDocument"))
        throw Error(
          "This kind of file cannot be read. Save it as Word, PDF or plain text and try again.",
        );
      mime = "application/msword";
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
      } else {
        const delimiter = isDelimited(text, name);
        if (delimiter)
          return {
            ...sheets(text, name, delimiter),
            mime: delimiter === "\t" ? "text/tab-separated-values" : "text/csv",
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
    const heading = text.match(/^ {0,3}#{1,6}\s+(.+)$/m)?.[1]?.trim();
    // A publisher or the first author is not a reliable document title.
    if (
      heading &&
      /^(?:Document|Upload|main|index|essay)$/i.test(documentTitle)
    )
      documentTitle = heading;
    return {
      title: documentTitle,
      mime,
      unclear,
      sections: sections(text, documentTitle),
    };
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
      return delimiter;
  }
  return undefined;
}
const isQuestion = (value: unknown) =>
  /^(?:q|question(?:s| text)?|prompt|inquiry|query|user question)$/i.test(
    String(value).trim(),
  );
const isAnswer = (value: unknown) =>
  /^(?:a|answer(?:s| text)?|response|clinical (?:answer|response)|reply|guidance)$/i.test(
    String(value).trim(),
  );
function sheets(
  buffer: Buffer | string,
  name: string,
  delimiter?: string,
): ReadResult {
  let book: XLSX.WorkBook;
  try {
    book = XLSX.read(buffer, {
      type: typeof buffer === "string" ? "string" : "buffer",
      cellDates: true,
      bookVBA: true,
      ...(delimiter ? { FS: delimiter } : {}),
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
  const result: ReadResult = {
    title: fileTitle(name),
    sections: [],
    sheets: [],
    unclear: false,
  };
  for (const sheetName of visible) {
    const rows = XLSX.utils
      .sheet_to_json<string[]>(book.Sheets[sheetName], {
        header: 1,
        defval: "",
        raw: false,
      })
      .map((row) => row.map(String));
    if (!rows.some((row) => row.some((cell) => cell.trim()))) continue;
    const headerRow = rows
      .slice(0, 20)
      .findIndex((row) => row.some(isQuestion) && row.some(isAnswer));
    if (headerRow >= 0) {
      const head = rows[headerRow];
      result.sheets!.push({
        name: sheetName,
        rows,
        headerRow,
        questionColumn: head.findIndex(isQuestion),
        answerColumn: head.findIndex(isAnswer),
      });
    } else {
      // An arbitrary spreadsheet is a table, not a set of answers to column A.
      // Preserve every column with its header so values retain their meaning.
      const header = rows[0] || [];
      const hasHeader = header.every(
        (cell) =>
          !cell.trim() ||
          (cell.length <= 80 &&
            !/[?.!]$/.test(cell.trim()) &&
            !/^\d+(?:\.\d+)?$/.test(cell.trim())),
      );
      const text = rows
        .slice(hasHeader ? 1 : 0)
        .map((row) =>
          row
            .map((cell, column) =>
              cell.trim()
                ? `${(hasHeader && header[column]?.trim()) || `Column ${column + 1}`}: ${cell}`
                : "",
            )
            .filter(Boolean)
            .join("; "),
        )
        .filter(Boolean)
        .join("\n\n");
      const title = /^(?:Sheet|Table)\s*\d+$/i.test(sheetName)
        ? result.title!
        : sheetName;
      result.sections.push(...sections(text || header.join(" | "), title));
    }
  }
  if (!result.sheets!.length) delete result.sheets;
  return result;
}
