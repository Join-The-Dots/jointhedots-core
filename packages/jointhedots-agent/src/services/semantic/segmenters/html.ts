import { SemanticUnit, SectionUnit, SectionLayout, TextualUnit } from "../units"

const HEADING_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"]
const SECTION_TAGS = ["section", "article", "aside", "nav", "header", "footer", "main"]

interface HtmlSection {
   tag: string
   level: number
   title: string
   content: string[]
   children: HtmlSection[]
}

export function segmentHtml(text: string): SemanticUnit {
   const root: HtmlSection = { tag: "root", level: 0, title: "", content: [], children: [] }
   const stack: HtmlSection[] = [root]

   // Simple regex-based parsing for headings and sections
   const tagPattern = /<(\/?)(\w+)[^>]*>|([^<]+)/gi
   let match: RegExpExecArray | null
   let currentText = ""

   while ((match = tagPattern.exec(text)) !== null) {
      const [, isClosing, tagName, textContent] = match

      if (textContent) {
         currentText += textContent
         continue
      }

      const tag = tagName?.toLowerCase()
      if (!tag) continue

      if (isClosing) {
         // Closing tag
         if (SECTION_TAGS.includes(tag) || HEADING_TAGS.includes(tag)) {
            if (currentText.trim()) {
               stack[stack.length - 1].content.push(currentText.trim())
               currentText = ""
            }
            if (stack.length > 1 && stack[stack.length - 1].tag === tag) {
               stack.pop()
            }
         }
      } else {
         // Opening tag
         if (currentText.trim()) {
            stack[stack.length - 1].content.push(currentText.trim())
            currentText = ""
         }

         if (HEADING_TAGS.includes(tag)) {
            const level = parseInt(tag[1])
            const section: HtmlSection = { tag, level, title: "", content: [], children: [] }
            // Pop sections with same or higher level
            while (stack.length > 1 && stack[stack.length - 1].level >= level) {
               stack.pop()
            }
            stack[stack.length - 1].children.push(section)
            stack.push(section)
         } else if (SECTION_TAGS.includes(tag)) {
            const section: HtmlSection = { tag, level: 100, title: "", content: [], children: [] }
            stack[stack.length - 1].children.push(section)
            stack.push(section)
         }
      }
   }

   // Flush remaining text
   if (currentText.trim()) {
      stack[stack.length - 1].content.push(currentText.trim())
   }

   return convertToSectionUnit(root, true)
}

function convertToSectionUnit(section: HtmlSection, isRoot: boolean): SemanticUnit {
   const content: SemanticUnit[] = []

   // First content item of heading becomes the title
   let title = section.title
   if (HEADING_TAGS.includes(section.tag) && section.content.length > 0) {
      title = section.content.shift()!
   }

   // Add remaining text content
   const textContent = section.content.join(" ").trim()
   if (textContent) {
      content.push(TextualUnit.New(textContent, "html"))
   }

   // Add children
   for (const child of section.children) {
      content.push(convertToSectionUnit(child, false))
   }

   if (isRoot && !title) {
      if (content.length === 1) return content[0]
      return SectionUnit.New(SectionLayout.Documentation, null, content)
   }

   return SectionUnit.New(
      SectionLayout.Documentation,
      title ? TextualUnit.New(title) : null,
      content
   )
}
