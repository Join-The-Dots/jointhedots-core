import React from "react"
import { Remark } from "react-remark"
import { Processor, unified } from "unified"
import RemarkParse from "remark-parse"
import RemarkFrontmatter from "remark-frontmatter"
import * as yaml from "js-yaml"
import { ASTNode, ASTProgram } from "core/AST"
import * as MD from "mdast"
import { MapLike } from "core/common"
import { SerializedHeadingNode, SerializedQuoteNode } from "@lexical/rich-text"
import { IS_BOLD, IS_CODE, IS_HIGHLIGHT, IS_ITALIC, IS_STRIKETHROUGH, IS_SUBSCRIPT, IS_SUPERSCRIPT, IS_UNDERLINE, SerializedElementNode, SerializedLexicalNode, SerializedLineBreakNode, SerializedParagraphNode, SerializedTextNode } from "lexical"
import { SerializedCodeNode } from "@lexical/code"
import { SerializedPageBreakNode } from "lexical-editor/nodes/PageBreak/PageBreakNode"
import { SerializedListItemNode, SerializedListNode } from "@lexical/list"
import { SerializedLinkNode } from "@lexical/link"
import { SerializedImageNode } from "lexical-editor/nodes/Images/ImageNode"
import { SerializedInlineImageNode } from "lexical-editor/nodes/InlineImage/InlineImageNode"
import { SerializedTableCellNode, SerializedTableNode, SerializedTableRowNode } from "@lexical/table"
import { mdxFromMarkdown, MdxJsxTextElement, mdxToMarkdown } from 'mdast-util-mdx'
import { Parser } from 'acorn'
import acornJsx from 'acorn-jsx'
import { mdxExpression } from 'micromark-extension-mdx-expression'
import { mdxJsx } from 'micromark-extension-mdx-jsx'
import { mdxjsEsm } from 'micromark-extension-mdxjs-esm'
import { mdxMd } from 'micromark-extension-mdx-md'
import { Extension } from 'micromark-util-types'
import { combineExtensions } from 'micromark-util-combine-extensions'
import { Options as AcornOptions } from 'acorn'

export interface AstDocument extends ASTNode {
   type: "document"
   content: (ASTNode | ASTNode)[]
}


function createNode<T>(n: Partial<T>): T {
   n["version"] = n["version"] || 1
   return n as T
}

export const TextFormats = {
   bold: IS_BOLD,
   code: IS_CODE,
   highlight: IS_HIGHLIGHT,
   italic: IS_ITALIC,
   strikethrough: IS_STRIKETHROUGH,
   subscript: IS_SUBSCRIPT,
   superscript: IS_SUPERSCRIPT,
   underline: IS_UNDERLINE,
}

function createText<T>(content: string | SerializedLexicalNode[], format?: string) {
   const text = content.toString()
   if (Array.isArray(content)) {
      return createNode<SerializedParagraphNode>({
         type: "paragraph",
         version: 1,
         textFormat: TextFormats[format] || 0,
         children: content,
      })
   }
   else {

      return createNode<SerializedTextNode>({
         type: "text",
         detail: 0,
         format: TextFormats[format] || 0,
         mode: null,
         style: '',
         text,
      })
   }
}

function createElement(format: string, children: SerializedLexicalNode[]): SerializedElementNode {
   return {
      type: "element",
      version: 1,
      format: '',
      indent: 0,
      direction: null,
      children,
   }
}

function convertChildren(children: MD.Node[]): SerializedLexicalNode[] {
   return children?.map(convertNode)
}

function convertNode(n: MD.Node): SerializedLexicalNode {
   const transformer = MDAST_DOCAST_TRANSFORMERS[n.type]
   if (transformer) {
      return transformer(n, 0) as SerializedLexicalNode
   }
   else {
      console.error("Unsupported MD-Ast node", n)
      return createNode<SerializedCodeNode>({
         type: "code",
         language: "json",
         children: [createText(shortStringify(n))]
      })
   }
}

function createCode(lang: string, code: string): SerializedCodeNode {
   return createNode<SerializedCodeNode>({
      type: "code",
      language: lang,
      children: [createText(code)],
   })
}

function shortStringify(n) {
   return JSON.stringify(n, (key, value) => {
      if ((key === "position" || key === "loc") && value?.start && value?.end) {
         return undefined
      }
      return value
   }, 2)
}

const MDAST_DOCAST_TRANSFORMERS: MapLike<(node: MD.Node, index: number) => ASTNode> = {
   "blockquote": (n: MD.Blockquote): SerializedQuoteNode => {
      return createNode<SerializedQuoteNode>({
         type: "quote",
         children: convertChildren(n.children)
      })
   },
   "break": (n: MD.Break): SerializedLineBreakNode => {
      return createNode<SerializedLineBreakNode>({
         type: 'line-break',
      })
   },
   "code": (n: MD.Code): SerializedCodeNode | SerializedLexicalNode => {
      if (n.lang === "display") {
         return createNode<SerializedLexicalNode>({
            type: n.meta,
            ...yaml.load(n.value)
         })
      }
      else {
         return createCode(n.lang, n.value)
      }
   },
   "definition": (n: MD.Definition) => {
      return createNode<SerializedLinkNode>({
         type: 'link',
         title: n.title,
         url: n.url,
         rel: n.identifier,
      })
   },
   "delete": (n: MD.Delete) => {
      return createText(convertChildren(n.children), "strikethrough")
   },
   "emphasis": (n: MD.Emphasis) => {
      return createText(convertChildren(n.children), "emphasis")
   },
   "footnoteDefinition": (n: MD.FootnoteDefinition) => {
      return createNode<SerializedLinkNode>({
         type: 'link',
         title: n.identifier,
         rel: n.identifier,
      })
   },
   "footnoteReference": (n: MD.FootnoteReference) => {
      return createNode<SerializedLinkNode>({
         type: 'link',
         title: n.label,
         rel: n.identifier,
      })
   },
   "heading": (n: MD.Heading) => {
      return createNode<SerializedHeadingNode>({
         type: 'heading',
         tag: `h${n.depth}`,
         children: convertChildren(n.children)
      })
   },
   "html": (n: MD.Html) => {
      return createCode("html", n.value)
   },
   "image": (n: MD.Image) => {
      return createNode<SerializedImageNode>({
         type: 'image',
         src: n.url,
         altText: n.alt || '',
      })
   },
   "imageReference": (n: MD.ImageReference) => {
      return createNode<SerializedInlineImageNode>({
         type: 'image',
         src: n.identifier,
         altText: n.alt || '',
      })
   },
   "inlineCode": (n: MD.InlineCode) => {
      return createText(n.value, "code")
   },
   "link": (n: MD.Link) => {
      return createNode<SerializedLinkNode>({
         type: 'link',
         url: n.url,
         children: convertChildren(n.children)
      })
   },
   "linkReference": (n: MD.LinkReference) => {
      return createNode<SerializedLinkNode>({
         type: 'link',
         url: "#" + n.identifier,
         children: convertChildren(n.children)
      })
   },
   "list": (n: MD.List) => {
      return createNode<SerializedListNode>({
         type: 'list',
         listType: n.ordered ? 'number' : 'bullet',
         start: n.start || 1,
         children: convertChildren(n.children)
      })
   },
   "listItem": (n: MD.ListItem, index: number) => {
      return createNode<SerializedListItemNode>({
         type: "listitem",
         checked: n.checked,
         value: index,
         children: convertChildren(n.children)
      })
   },
   "paragraph": (n: MD.Paragraph) => {
      return createText(convertChildren(n.children))
   },
   "strong": (n: MD.Strong) => {
      return createText(convertChildren(n.children), "bold")
   },
   "table": (n: MD.Table) => {
      return createNode<SerializedTableNode>({
         type: "table",
         children: convertChildren(n.children),
      })
   },
   "tableCell": (n: MD.TableCell) => {
      return createNode<SerializedTableCellNode>({
         type: "tablecell",
         children: convertChildren(n.children),
      })
   },
   "tableRow": (n: MD.TableRow) => {
      return createNode<SerializedTableRowNode>({
         type: "tablerow",
         children: convertChildren(n.children),
      })
   },
   "text": (n: MD.Text) => {
      return createText(n.value)
   },
   "mdxJsxTextElement": (n: MdxJsxTextElement) => {
      return createCode("jsx", shortStringify(n))
   },
   "thematicBreak": (n: MD.ThematicBreak) => {
      return createNode<SerializedPageBreakNode>({
         type: "page-break",
      })
   },
   "yaml": (n: MD.Yaml) => {
      return createCode("yaml", n.value)
   },
}

export function deserialize_model_markdown(bytes: string): ASTProgram {
   const parser = unified()
      .use(RemarkParse)
      .use(RemarkMdx)
      .use(RemarkFrontmatter)

   const root = parser.parse(bytes)
   const data = root.children.shift()

   const content = convertChildren(root.children)

   const layout = {
      type: "document",
      content,
   } as AstDocument

   return {
      type: "flow",
      layout,
   }
}

function RemarkMdx() {
   const self: Processor = this
   const data = self.data() as any

   const micromarkExtensions = data.micromarkExtensions || (data.micromarkExtensions = [])
   const fromMarkdownExtensions = data.fromMarkdownExtensions || (data.fromMarkdownExtensions = [])
   const toMarkdownExtensions = data.toMarkdownExtensions || (data.toMarkdownExtensions = [])

   const settings = {
      acorn: Parser.extend(acornJsx()),
      acornOptions: {
         ecmaVersion: 2024,
         sourceType: 'module',
         locations: false,
      } as AcornOptions,
      addResult: true
   }

   const extensions = [] as Extension[]
   //extensions.push(mdxjsEsm(settings))
   extensions.push(mdxExpression(settings))
   extensions.push(mdxJsx(settings))
   extensions.push(mdxMd())

   micromarkExtensions.push(combineExtensions(extensions))
   fromMarkdownExtensions.push(mdxFromMarkdown())
   toMarkdownExtensions.push(mdxToMarkdown())
}
