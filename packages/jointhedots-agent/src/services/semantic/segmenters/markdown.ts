import { SemanticUnit, SectionUnit, SectionLayout, SectionLanguage, TextualUnit } from "../units"

interface MarkdownSection {
   level: number
   title: string
   content: string[]
   children: MarkdownSection[]
}

export function segmentMarkdown(text: string): SemanticUnit {
   const lines = text.split(/\r?\n/)
   const root: MarkdownSection = { level: 0, title: "", content: [], children: [] }
   const stack: MarkdownSection[] = [root]

   for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
      if (headingMatch) {
         const level = headingMatch[1].length
         const title = headingMatch[2].trim()
         const section: MarkdownSection = { level, title, content: [], children: [] }

         // Find parent: pop until we find a section with lower level
         while (stack.length > 1 && stack[stack.length - 1].level >= level) {
            stack.pop()
         }
         stack[stack.length - 1].children.push(section)
         stack.push(section)
      } else {
         stack[stack.length - 1].content.push(line)
      }
   }

   return convertToSectionUnit(root, true)
}

function convertToSectionUnit(section: MarkdownSection, isRoot: boolean): SemanticUnit {
   const content: SemanticUnit[] = []

   // Add text content if any (trim empty lines at start/end)
   const textContent = section.content.join("\n").trim()
   if (textContent) {
      content.push(TextualUnit.New(textContent, "markdown"))
   }

   // Add children sections
   for (const child of section.children) {
      content.push(convertToSectionUnit(child, false))
   }

   if (isRoot && !section.title) {
      // Root without title: return content directly if single item
      if (content.length === 1) return content[0]
      return SectionUnit.New(SectionLayout.Documentation, null, content)
   }

   return SectionUnit.New(
      SectionLayout.Documentation,
      section.title ? TextualUnit.New(section.title) : null,
      content
   )
}
