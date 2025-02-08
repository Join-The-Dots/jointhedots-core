import { MergeKind, Token, TokenBaseId, TokenizerFormat, TokenPattern, TokenStream } from "./tokenizer"
import { print } from "@polycuber/script.cli"
import * as Acorn from 'acorn'
import * as AST from "../nodes"

enum XHTMLTokId {
   EOF, // = TokenBaseId.EOF
   Chunk, // = TokenBaseId.Chunk

   Identifier,
   StringLiteral,
   NumberLiteral,

   Equal,
   BraceL,
   BraceR,
   HookL,
   HookR,

   MARKUP_ElementHeader,
   MARKUP_ElementClosure,
   MARKUP_TagEnding,
   MARKUP_TagClosure,

   MDX_Block,
   MDX_Expression,
   MDX_EndLine,
   MDX_Item,

   __next,
}


const Identifier = new TokenPattern(XHTMLTokId.Identifier, "Identifier", "", (tok) => {
   tok.data = tok.raw
   return true
}, /[a-zA-Z0-9_^-^:]+/g)

const NumberLiteral = new TokenPattern(XHTMLTokId.NumberLiteral, "NumberLiteral", "", (tok) => {
   tok.data = parseFloat(tok.raw)
   return true
}, /-?\b\d+(\.\d+)?\b/g)

const StringLiteral = new TokenPattern(XHTMLTokId.StringLiteral, "StringLiteral", "", (tok) => {
   tok.data = JSON.parse(tok.raw)
   return true
}, /"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'/g)



const Equal = new TokenPattern(XHTMLTokId.Equal, "Equal", "=")
const BraceL = new TokenPattern(XHTMLTokId.BraceL, "BraceL", "{")
const BraceR = new TokenPattern(XHTMLTokId.BraceR, "BraceR", "}")
const HookL = new TokenPattern(XHTMLTokId.HookL, "HookL", "[")
const HookR = new TokenPattern(XHTMLTokId.HookR, "HookR", "]")


function parse_jsx_expression(stream: TokenStream): AST.Any {
   const node = Acorn.parseExpressionAt(stream.input, stream.pos, { ecmaVersion: 2020 })
   stream.pos = node.end
   return node
}

function parse_jsx_attribute_value(tok: Token, stream: TokenStream): AST.Any {
   if (tok.id === XHTMLTokId.BraceL) {
      const node = parse_jsx_expression(stream)
      const closer = stream.next()
      if (closer.id !== XHTMLTokId.BraceR) {
         throw new Error()
      }
      return node
   }
   else if (tok.id === XHTMLTokId.StringLiteral) {
      return {
         type: "Literal",
         value: tok.data,
      }
   }
   else if (tok.id === XHTMLTokId.NumberLiteral) {
      return {
         type: "Literal",
         value: tok.data,
      }
   }
   return null
}

function parse_paragraph(lines: AST.JSXContentChunk[][], withtext: boolean, rank: number, out: AST.Any[]): AST.Any[] {

   // Parse elements (note: no paragraph packaging for rank 0)
   const elements: AST.Any[] = (rank === 0) ? out : []
   for (const chunks of lines) {
      for (const chunk of chunks) {
         if (typeof chunk === "string") {
            elements.push({
               type: "Literal",
               value: chunk,
            })
         }
         else {
            elements.push(chunk)
         }
      }
   }

   // Make paragraph packaging
   if (rank > 0) {
      if (rank === 1) { // Package previous rank 0 elements before
         if (out.length === 1 && out[0].type === "JSXElement") {
            // No need to pack into a paragraph
         }
         else {
            out = [{
               type: "JSXElement",
               tag: "p",
               content: {
                  type: "ArrayExpression",
                  elements: out as any,
               },
            }]
         }
      }
      if (elements.length === 1 && elements[0].type === "JSXElement") {
         out.push(elements[0])
      }
      else {
         out.push({
            type: "JSXElement",
            tag: "p",
            content: {
               type: "ArrayExpression",
               elements: elements as any,
            },
         })
      }
   }

   return out
}



function parse_jsx_document(stream: TokenStream, matchEnd?: (tok: Token) => boolean): AST.Any[] {
   let out: AST.Any[] = []
   let line_chunks: AST.JSXContentChunk[] = null
   let line_withtext = false
   let paragraph_lines: AST.JSXContentChunk[][] = null
   let paragraph_withtext = false
   let rank = 0
   while (!stream.isEOF()) {
      const tok = stream.next()

      // Swallow chunk
      if (tok.chunk) {
         let text = tok.chunk.raw
         if (!line_chunks) {
            text = text.trimStart()
            if (text !== "") {
               line_chunks = [text]
               line_withtext = true
            }
         }
         else {
            line_chunks.push(text)
            line_withtext = true
         }
      }

      // Swallow end paragraph token
      const isEnd = matchEnd && matchEnd(tok) || tok.id === TokenBaseId.EOF
      if (isEnd || tok.id === XHTMLTokId.MDX_EndLine) {
         if (line_chunks) {
            if (!paragraph_lines) paragraph_lines = []
            paragraph_lines.push(line_chunks)
            paragraph_withtext = paragraph_withtext || line_withtext
            line_chunks = null
            line_withtext = false
         }
         else if (paragraph_lines) {
            out = parse_paragraph(paragraph_lines, paragraph_withtext, rank++, out)
            paragraph_lines = null
            paragraph_withtext = false
         }
         else {
            // Space between paragraph 
         }
         if (isEnd) {
            break
         }
      }
      // Swallow embed token
      else {
         let embed: AST.Any = tok.data
         if (embed) {
            if (!line_chunks) line_chunks = []
            line_chunks.push(embed)
         }
         else {
            print.error(`Token ignored: ${tok.rule.name}`)
         }
      }
   }

   // Parse last line before end
   if (paragraph_lines) {
      out = parse_paragraph(paragraph_lines, paragraph_withtext, rank++, out)
   }
   return out
}

function parse_jsx_inner_document(stream: TokenStream, matchEnd?: (tok: Token) => boolean): AST.JSXNode {
   const items = parse_jsx_document(stream, matchEnd)
   if (items.length === 1) {
      const main = items[0]
      if (main.type === "JSXContent" || main.type === "JSXElement") {
         return main
      }
   }
   return {
      type: "JSXDocument",
      format: "markdown",
      items,
   }
}

function parse_jsx_root_document(stream: TokenStream, matchEnd?: (tok: Token) => boolean): AST.JSXDocument {
   const items = parse_jsx_document(stream, matchEnd)
   return {
      type: "JSXDocument",
      format: "markdown",
      items,
   }
}

function parse_jsx_attributes(stream: TokenStream): AST.JSXAttribute[] {
   let attributes: AST.JSXAttribute[] = null
   let stok: Token = null
   for (; ;) {
      stok = stream.next()
      if (stok.id === XHTMLTokId.Identifier) {
         let name = stok.data
         let ns = ""

         // Parse namespace and get attributes collection
         const ns_index = name.indexOf(":")
         if (ns_index > 0) {
            ns = name.slice(0, ns_index)
            name = name.slice(ns_index + 1)
         }

         // Parse attribute value 
         const ntok = stream.next()
         let value: AST.Any = null
         if (ntok.id === XHTMLTokId.Equal) {
            value = parse_jsx_attribute_value(stream.next(), stream)
         }
         else {
            stream.retain()
            value = { type: "Literal", value: true } as Acorn.Literal
         }

         // Append attribute 
         if (!attributes) attributes = []
         attributes.push({ type: "JSXAttribute", ns, name, value })
      }
      else if (stok.id === XHTMLTokId.BraceL) {

         // Append spread  attribute
         if (!attributes) attributes = []
         attributes.push({
            type: "JSXAttribute",
            ns: "",
            name: "",
            value: parse_jsx_expression(stream),
         })
      }
      else {
         break
      }
   }
   return attributes
}

function parse_jsx_element(tag: string, stream: TokenStream): AST.JSXElement {

   // Parse node and atttributes
   const node: AST.JSXElement = {
      type: "JSXElement",
      tag,
      attributes: parse_jsx_attributes(stream),
      content: undefined,
   }

   // Check ending
   let stok = stream.last
   if (stok.id === XHTMLTokId.MARKUP_TagClosure) {

      const doc_stream = stok.fork(Tokenizer_JSXDocument)
      node.content = parse_jsx_inner_document(doc_stream, (tok) => {
         return (tok.id === XHTMLTokId.MARKUP_ElementClosure)
      })
      doc_stream.merge(MergeKind.ChunkEnd)

      stok = stream.next()
      if (stok.id === XHTMLTokId.MARKUP_ElementClosure && stok.data === node.tag) {
         stok = stream.next()
         if (stok.id === XHTMLTokId.MARKUP_TagClosure) {
            return node
         }
      }
      throw new Error(`End markup '</${node.tag}>' expected`)
   }
   else {
      if (stok.id === XHTMLTokId.MARKUP_TagEnding) {
         return node
      }
      throw new Error(`Markup end '>' expected`)
   }
}

const MARKUP_ElementHeader = new TokenPattern(XHTMLTokId.MARKUP_ElementHeader, "MARKUP_ElementHeader", "<", (tok) => {
   try {
      const stream = tok.fork(Tokenizer_JSX)
      const element = parse_jsx_element(tok.match[1], stream)
      if (element) {
         stream.merge(MergeKind.TokenEnd)
         tok.data = element
         return true
      }
   }
   catch (e) {
      print.error(e.message)
   }
   return false
}, /<([a-zA-Z][a-zA-Z0-9_\.\-\:]*)/g)

const MARKUP_ElementClosure = new TokenPattern(XHTMLTokId.MARKUP_ElementClosure, "MARKUP_ElementClosure", "</", (tok) => {
   tok.data = tok.match[1]
   return true
}, /<\/([a-zA-Z][a-zA-Z0-9_\.\-\:]*)/g)

const MARKUP_TagEnding = new TokenPattern(XHTMLTokId.MARKUP_TagEnding, "MARKUP_TagEnding", "/>")

const MARKUP_TagClosure = new TokenPattern(XHTMLTokId.MARKUP_TagClosure, "MARKUP_TagClosure", ">")

const MDX_Expression = new TokenPattern(XHTMLTokId.MDX_Expression, "MDX_Expression", "{", (tok) => {
   const stream = tok.fork(Tokenizer_JSX)
   tok.data = parse_jsx_expression(stream)
   const closer = stream.next()
   if (closer.id !== XHTMLTokId.BraceR) {
      throw new Error()
   }
   stream.merge(MergeKind.TokenEnd)
   return true
}, /(?<!\\){/g)

const MDX_EndLine = new TokenPattern(XHTMLTokId.MDX_EndLine, "MDX_EndLine", "\n", (tok) => {
   return true
})

function parse_content_embeds(source: TokenStream, format: string, mark: string, start: number, end: number): AST.JSXContent {
   const { input } = source
   const content: AST.JSXContentChunk[] = []

   let pos = start
   mark += "{"
   for (; ;) {
      let embed_pos = input.indexOf(mark, pos)
      if (embed_pos >= start && embed_pos < end) {
         try {
            const node = Acorn.parseExpressionAt(input, embed_pos + mark.length, { ecmaVersion: 2020 })
            let embed_end = input.indexOf("}", node.end)
            if (embed_end < end) {
               const chunk = input.slice(start, embed_pos)
               content.push(chunk, node)
               start = embed_end + 1
               pos = start
            }
            else {
               print.error(`Bad content embed closure with '}'`)
               pos = embed_pos + mark.length
            }
         }
         catch (_) {
            pos = embed_pos + mark.length
         }
      }
      else {
         break
      }
   }
   if (start < end) {
      const chunk = input.slice(start, end)
      content.push(chunk)
   }
   return {
      type: "JSXContent",
      format,
      content,
   }
}

const MDX_Block_Head_regx = /([a-zA-Z0-9]*)\s*(<([a-zA-Z][a-zA-Z0-9_\.\-\:]*)|(?:\[))?/g

const MDX_Block = new TokenPattern(XHTMLTokId.MDX_Block, "MDX_Block", "```", (tok) => {
   const { start, match, source } = tok
   const { input } = source

   // Extract block span
   const block_mark = match[1]
   const block_start = start + block_mark.length
   const block_end = input.indexOf(block_mark, block_start)
   const head_end = input.indexOf("\n", block_start)
   tok.end = block_end + block_mark.length

   // Parse basic inline block
   const isInline = head_end < 0 || head_end > block_end
   if (isInline) {
      tok.data = parse_content_embeds(source, "inline",
         block_mark.slice(0, -1), block_start, block_end)
   }
   // Parse advanced block
   else {
      let tag: string = null
      let attributes: AST.JSXAttribute[] = null

      // Parse head
      MDX_Block_Head_regx.lastIndex = block_start
      const head = MDX_Block_Head_regx.exec(input)
      const format: string = head[1]
      const head_start = block_start + head[0].length
      const head_element = head[2]
      if (head_element && head_element.length > 0) {
         const stream = source.fork(Tokenizer_JSX, head_start, head_end)
         tag = head[3]
         try {
            // Parse tagged element <tag ...>
            if (tag && tag.length > 0) {
               attributes = parse_jsx_attributes(stream)
               if (stream.last.id !== XHTMLTokId.MARKUP_TagClosure && stream.last.id !== XHTMLTokId.MARKUP_TagEnding) {
                  print.error(`Bad block jsx element ending`)
               }
            }
            // Parse anonymous element [...]
            else {
               tag = "code"
               attributes = parse_jsx_attributes(stream)
               if (stream.last.id !== XHTMLTokId.HookR) {
                  print.error(`Bad block anonymous element ending`)
               }
            }
         }
         catch (e) {
            print.error(e.message)
         }
      }
      else {
         // ignored metadata
      }

      // Parse content
      let content_end = block_end
      while (input.charCodeAt(content_end) !== 10) {
         content_end--
      }
      const content = parse_content_embeds(source, format, block_mark.slice(0, -1),
         head_end + 1, block_end - 1)

      // Create ast node
      if (tag) {
         tok.data = {
            type: "JSXElement",
            tag,
            attributes,
            content,
         } as AST.JSXElement
      }
      else {
         tok.data = content
      }
   }
   return true
}, /(```+)/g)

const Tokenizer_JSX = new TokenizerFormat([
   MARKUP_ElementClosure, MARKUP_TagEnding, MARKUP_TagClosure,
   Identifier, NumberLiteral, StringLiteral,
   BraceL, BraceR, HookL, HookR, Equal,
]).complete()

const Tokenizer_Document = new TokenizerFormat([
   MDX_EndLine, MDX_Block, MDX_Expression, MARKUP_ElementHeader,
]).allowAnyChunk().complete()

const Tokenizer_JSXDocument = new TokenizerFormat([
   ...Tokenizer_Document.rules, MARKUP_ElementClosure
]).allowAnyChunk().complete()


export function parse_document(input: string) {
   const stream = new TokenStream(input.replaceAll("\r", ""), Tokenizer_Document)
   return parse_jsx_root_document(stream)
}
