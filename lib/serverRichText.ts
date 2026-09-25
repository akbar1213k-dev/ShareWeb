import sanitizeHtml from "sanitize-html";
import { RICH_TEXT_ATTRIBUTES, RICH_TEXT_TAGS } from "@/lib/richText";

const safeColor =
  /^(?:#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([\d\s.,%+-]+\)|[a-z]+)$/i;
const safeLength =
  /^(?:0|-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|pt|pc|em|rem|ex|ch|vh|vw|%))$/i;
const safeFontFamily = /^[^(){}\[\]@;]+$/;

const allowedStyles: sanitizeHtml.IOptions["allowedStyles"] = {
  "*": {
    color: [safeColor],
    "background-color": [safeColor],
    "font-family": [safeFontFamily],
    "font-size": [
      /^(?:xx-small|x-small|small|medium|large|x-large|xx-large|smaller|larger)$/i,
      safeLength,
    ],
    "font-style": [/^(?:normal|italic|oblique)$/i],
    "font-variant": [/^(?:normal|small-caps)$/i],
    "font-weight": [/^(?:normal|bold|bolder|lighter|[1-9]00)$/i],
    "letter-spacing": [/^normal$/i, safeLength],
    "line-height": [/^normal$/i, /^\d+(?:\.\d+)?$/, safeLength],
    "list-style-type": [/^[a-z-]+$/i],
    "text-align": [/^(?:left|right|center|justify|start|end)$/i],
    "text-decoration": [/^[\w\s#.-]+$/],
    "text-decoration-color": [safeColor],
    "text-decoration-line": [
      /^(?:none|underline|line-through|overline|blink)$/i,
    ],
    "text-decoration-style": [/^(?:solid|double|dotted|dashed|wavy)$/i],
    "text-indent": [safeLength],
    "text-transform": [
      /^(?:none|capitalize|uppercase|lowercase|full-width)$/i,
    ],
    "vertical-align": [
      /^(?:baseline|sub|super|top|text-bottom|middle|bottom|text-top)$/i,
      safeLength,
    ],
    "white-space": [/^(?:normal|pre|pre-wrap|pre-line|break-spaces)$/i],
    "word-break": [/^(?:normal|break-all|keep-all|break-word)$/i],
  },
};

const commonAttributes = RICH_TEXT_ATTRIBUTES.filter(
  (attribute) =>
    ![
      "abbr",
      "cellpadding",
      "cellspacing",
      "color",
      "colspan",
      "face",
      "headers",
      "height",
      "href",
      "name",
      "rel",
      "reversed",
      "rowspan",
      "scope",
      "size",
      "span",
      "start",
      "target",
      "type",
      "valign",
      "value",
      "width",
    ].includes(attribute)
);

export function sanitizeRichTextHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: RICH_TEXT_TAGS,
    allowedAttributes: {
      "*": commonAttributes,
      a: ["href", "name", "rel", "target", "title"],
      col: ["span", "style", "width"],
      colgroup: ["span", "style", "width"],
      font: ["color", "face", "size", "style"],
      li: ["style", "type", "value"],
      ol: ["reversed", "start", "style", "type"],
      table: ["cellpadding", "cellspacing", "style", "width"],
      td: [
        "abbr",
        "align",
        "colspan",
        "headers",
        "height",
        "rowspan",
        "scope",
        "style",
        "valign",
        "width",
      ],
      th: [
        "abbr",
        "align",
        "colspan",
        "headers",
        "height",
        "rowspan",
        "scope",
        "style",
        "valign",
        "width",
      ],
      tr: ["style"],
    },
    allowedStyles,
    allowedSchemes: ["http", "https", "ftp", "mailto", "tel"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    nestingLimit: 100,
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
    },
    exclusiveFilter: (frame) =>
      frame.tag === "a" && !frame.attribs.href ? "excludeTag" : false,
  });
}

export function hasRichTextContent(html: string): boolean {
  const text = sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
  });
  return text.replace(/&(?:nbsp|#160|#xa0);/gi, " ").trim().length > 0;
}
