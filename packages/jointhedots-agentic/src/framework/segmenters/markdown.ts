import { Lexer, Token, Tokens } from "marked"
import { SemanticUnit, SectionUnit, SectionLayout, TextualUnit } from "../semantic/units"

interface MarkdownSection {
   level: number
   title: string
   content: Token[]
   children: MarkdownSection[]
}

export function segmentMarkdown(text: string): SemanticUnit {
   const lexer = new Lexer()
   const tokens = lexer.lex(text)

   const root: MarkdownSection = { level: 0, title: "", content: [], children: [] }
   const stack: MarkdownSection[] = [root]

   for (const token of tokens) {
      if (token.type === "heading") {
         const heading = token as Tokens.Heading
         const level = heading.depth
         const title = heading.text
         const section: MarkdownSection = { level, title, content: [], children: [] }

         // Find parent: pop until we find a section with lower level
         while (stack.length > 1 && stack[stack.length - 1].level >= level) {
            stack.pop()
         }
         stack[stack.length - 1].children.push(section)
         stack.push(section)
      } else {
         stack[stack.length - 1].content.push(token)
      }
   }

   return convertToSectionUnit(root, true)
}

function tokenToSemanticUnit(token: Token): SemanticUnit | null {
   switch (token.type) {
      case "code": {
         const code = token as Tokens.Code
         return SectionUnit.New(SectionLayout.Code, null, code.text, code.lang || "plaintext")
      }
      case "blockquote": {
         const blockquote = token as Tokens.Blockquote
         const innerUnits = tokensToSemanticUnits(blockquote.tokens)
         return SectionUnit.New(SectionLayout.BlockQuote, null, innerUnits)
      }
      case "list": {
         const list = token as Tokens.List
         const items = list.items.map((item: Tokens.ListItem) => {
            const itemContent = tokensToSemanticUnits(item.tokens)
            return itemContent.length === 1 ? itemContent[0] : SectionUnit.New(SectionLayout.Documentation, null, itemContent)
         })
         return SectionUnit.New(SectionLayout.Documentation, null, items)
      }
      case "table": {
         const table = token as Tokens.Table
         // Reconstruct table as markdown text
         return SectionUnit.New(SectionLayout.Documentation, null, [TextualUnit.New(token.raw.trim(), "markdown")])
      }
      case "html": {
         const html = token as Tokens.HTML
         return SectionUnit.New(SectionLayout.Code, null, html.raw.trim(), "html")
      }
      case "paragraph": {
         const para = token as Tokens.Paragraph
         return TextualUnit.New(para.raw.trim(), "markdown")
      }
      case "text": {
         const text = token as Tokens.Text
         const content = text.raw.trim()
         if (!content) return null
         return TextualUnit.New(content, "markdown")
      }
      case "space":
         return null
      case "hr":
         return TextualUnit.New("---", "markdown")
      case "def": {
         const def = token as Tokens.Def
         return TextualUnit.New(token.raw.trim(), "markdown")
      }
      case "escape":
      case "br":
         return null
      default:
         // For any other token types, use raw content
         if (token.raw && token.raw.trim()) {
            return TextualUnit.New(token.raw.trim(), "markdown")
         }
         return null
   }
}

function tokensToSemanticUnits(tokens: Token[]): SemanticUnit[] {
   const units: SemanticUnit[] = []
   for (const token of tokens) {
      const unit = tokenToSemanticUnit(token)
      if (unit) {
         units.push(unit)
      }
   }
   return units
}

function convertToSectionUnit(section: MarkdownSection, isRoot: boolean): SemanticUnit {
   const content: SemanticUnit[] = []

   // Convert tokens to semantic units
   const tokenUnits = tokensToSemanticUnits(section.content)
   content.push(...tokenUnits)

   // Add children sections
   for (const child of section.children) {
      content.push(convertToSectionUnit(child, false))
   }

   if (isRoot && !section.title) {
      // Root without title: return content directly if single item
      if (content.length === 1) return content[0]
      if (content.length === 0) return TextualUnit.New("", "markdown")
      return SectionUnit.New(SectionLayout.Documentation, null, content)
   }

   return SectionUnit.New(
      SectionLayout.Documentation,
      section.title ? TextualUnit.New(section.title) : null,
      content
   )
}
