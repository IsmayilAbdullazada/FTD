import { parse } from "parse5";
import { DOMParser } from "@xmldom/xmldom";
import rtf from "@iarna/rtf-to-html";

// Keep inline runs contiguous; add separators only for document structure.
export function htmlText(source: string): string {
  const walk = (node: any, numbered = false, index = 1): string => {
    if (node.nodeName === "#text") return node.value;
    const tag = node.tagName || "";
    if (
      ["script", "style", "head", "nav", "noscript", "template"].includes(tag)
    )
      return "";
    if (tag === "br") return "\n";
    if (tag === "ol" || tag === "ul") {
      let n = 0;
      return (
        "\n\n" +
        (node.childNodes || [])
          .map((child: any) =>
            walk(child, tag === "ol", child.tagName === "li" ? ++n : n),
          )
          .join("") +
        "\n\n"
      );
    }
    const text = (node.childNodes || [])
      .map((child: any) => walk(child))
      .join("");
    if (/^h[1-6]$/.test(tag))
      return `\n\n${"#".repeat(Number(tag[1]))} ${text.trim()}\n\n`;
    if (tag === "li") return `${numbered ? index + "." : "-"} ${text.trim()}\n`;
    if (tag === "td" || tag === "th") return text.trim() + "\t";
    if (tag === "tr") return text.trim() + "\n";
    if (
      ["p", "div", "section", "article", "blockquote", "table", "pre"].includes(
        tag,
      )
    )
      return "\n\n" + text + "\n\n";
    return text;
  };
  return tidy(walk(parse(source)));
}
export const tidy = (text: string) =>
  text
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export function xmlDocument(source: string) {
  // Some legacy exporters omit namespace declarations. Declare known prefixes before parsing.
  const namespaces: Record<string, string> = {
    a: "http://schemas.openxmlformats.org/drawingml/2006/main",
    p: "http://schemas.openxmlformats.org/presentationml/2006/main",
    text: "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
    office: "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
  };
  const missing = Object.keys(namespaces).filter(
    (prefix) =>
      source.includes(prefix + ":") &&
      !source.includes("xmlns:" + prefix + "="),
  );
  source = source.replace(
    /<([\w:.-]+)(?=[\s>])/,
    (match) =>
      match +
      missing
        .map((prefix) => ` xmlns:${prefix}="${namespaces[prefix]}"`)
        .join(""),
  );
  return new DOMParser({ onError: () => {} }).parseFromString(
    source,
    "text/xml",
  );
}
export function officeText(source: string, slides = false): string {
  const doc = xmlDocument(source);
  const walk = (node: any): string => {
    if (node.nodeType === 3) return node.nodeValue;
    const tag = node.localName || node.nodeName?.split(":").at(-1);
    if (
      slides &&
      tag === "sp" &&
      Array.from(node.getElementsByTagName("*")).some(
        (x: any) =>
          x.localName === "ph" &&
          ["sldNum", "hdr", "ftr", "dt"].includes(x.getAttribute("type")),
      )
    )
      return "";
    if (tag === "s")
      return " ".repeat(
        Math.min(100, Number(node.getAttribute("text:c")) || 1),
      );
    if (["line-break", "br"].includes(tag)) return "\n";
    if (tag === "tab") return "\t";
    const value = Array.from(node.childNodes || [])
      .map(walk)
      .join("");
    if (tag === "h") return "\n\n# " + value.trim() + "\n\n";
    if (tag === "p") return value + "\n\n";
    if (tag === "table-cell") return value.trim() + "\t";
    if (tag === "table-row") return value.trim() + "\n";
    if (tag === "list-item") return "- " + value.trim() + "\n";
    return value;
  };
  return tidy(walk(doc));
}
// RTF unicode escapes include an ANSI fallback of ucN characters. The parser
// understands the Unicode value but does not discard that fallback itself.
function withoutUnicodeFallback(source: string) {
  let count = 1,
    skip = 0;
  const stack: number[] = [];
  return (
    source.match(
      /\\uc-?\d+ ?|\\u-?\d+ ?|\\'[a-fA-F0-9]{2}|\\[^a-zA-Z]|\\[a-zA-Z]+-?\d* ?|[{}]|[^\\{}]+/g,
    ) || []
  )
    .map((part) => {
      if (part === "{") {
        stack.push(count);
        skip = 0;
        return part;
      }
      if (part === "}") {
        count = stack.pop() ?? 1;
        skip = 0;
        return part;
      }
      const uc = part.match(/^\\uc(-?\d+)/);
      if (uc) {
        count = Math.max(0, Number(uc[1]));
        return part;
      }
      const unicode = part.match(/^\\u(-?\d+)/);
      if (unicode) {
        skip = count;
        const value = Number(unicode[1]);
        return "\\u" + (value > 32767 ? value - 65536 : value) + " ";
      }
      if (!skip) return part;
      if (part.startsWith("\\")) {
        if (/^\\(?:'|[^a-zA-Z])/.test(part)) {
          skip--;
          return "";
        }
        return part;
      }
      const removed = Math.min(skip, part.length);
      skip -= removed;
      return part.slice(removed);
    })
    .join("");
}
export async function rtfText(source: string): Promise<string> {
  // The RTF reader only emits paragraphs at an explicit terminator. Flush the
  // final root paragraph too, as many editors omit its optional final \par.
  source = withoutUnicodeFallback(source).replace(/}\s*$/, "\\par}");
  const html = await new Promise<string>((resolve, reject) =>
    rtf.fromString(source, (error: Error | null, value: string) =>
      error ? reject(error) : resolve(value),
    ),
  );
  return htmlText(html);
}
export function decodeText(buffer: Buffer): string {
  const bom = buffer.subarray(0, 2).toString("hex");
  let text: string;
  if (bom === "fffe" || bom === "feff")
    text = new TextDecoder(bom === "fffe" ? "utf-16le" : "utf-16be", {
      fatal: true,
    }).decode(buffer);
  else {
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      text = new TextDecoder("windows-1252").decode(buffer);
    }
  }
  if (/[\u0000-\u0008\u000e-\u001f]/.test(text))
    throw Error(
      "This file cannot be read. Save it as plain text and upload again.",
    );
  return text;
}
