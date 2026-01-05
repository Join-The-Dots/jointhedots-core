import { SemanticUnit, SectionUnit, SectionLayout, TextualUnit } from "../units"

// Code block types for classification
export type CodeBlockType =
   | "function" | "method" | "constructor"
   | "class" | "interface" | "type" | "enum" | "struct"
   | "import" | "export"
   | "variable" | "constant"
   | "comment" | "decorator"
   | "namespace" | "module"
   | "block" | "unknown"

interface CodeBlock {
   type: CodeBlockType
   name: string
   indent: number
   startLine: number
   endLine: number
   content: string[]
   children: CodeBlock[]
}

// Language-specific patterns for classification
const PATTERNS: Record<string, { pattern: RegExp, type: CodeBlockType }[]> = {
   // TypeScript/JavaScript patterns
   ts: [
      { pattern: /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/, type: "function" },
      { pattern: /^\s*(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/, type: "class" },
      { pattern: /^\s*(?:export\s+)?interface\s+(\w+)/, type: "interface" },
      { pattern: /^\s*(?:export\s+)?type\s+(\w+)/, type: "type" },
      { pattern: /^\s*(?:export\s+)?enum\s+(\w+)/, type: "enum" },
      { pattern: /^\s*(?:export\s+)?namespace\s+(\w+)/, type: "namespace" },
      { pattern: /^\s*(?:public|private|protected|static|async)?\s*(\w+)\s*\([^)]*\)\s*[:{]/, type: "method" },
      { pattern: /^\s*constructor\s*\(/, type: "constructor" },
      { pattern: /^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)/, type: "variable" },
      { pattern: /^\s*import\s+/, type: "import" },
      { pattern: /^\s*export\s+/, type: "export" },
      { pattern: /^\s*@\w+/, type: "decorator" },
      { pattern: /^\s*\/\/|^\s*\/\*/, type: "comment" },
   ],
   // C/C++ patterns
   cpp: [
      { pattern: /^\s*(?:virtual\s+)?(?:\w+\s+)+(\w+)\s*\([^)]*\)\s*(?:const)?\s*(?:override)?\s*[{;]/, type: "function" },
      { pattern: /^\s*(?:template\s*<[^>]*>\s*)?class\s+(\w+)/, type: "class" },
      { pattern: /^\s*struct\s+(\w+)/, type: "struct" },
      { pattern: /^\s*enum\s+(?:class\s+)?(\w+)/, type: "enum" },
      { pattern: /^\s*namespace\s+(\w+)/, type: "namespace" },
      { pattern: /^\s*typedef\s+/, type: "type" },
      { pattern: /^\s*using\s+(\w+)/, type: "type" },
      { pattern: /^\s*#include\s+/, type: "import" },
      { pattern: /^\s*#define\s+(\w+)/, type: "constant" },
      { pattern: /^\s*\/\/|^\s*\/\*/, type: "comment" },
   ],
   // Python patterns
   py: [
      { pattern: /^\s*(?:async\s+)?def\s+(\w+)/, type: "function" },
      { pattern: /^\s*class\s+(\w+)/, type: "class" },
      { pattern: /^\s*import\s+|^\s*from\s+\w+\s+import/, type: "import" },
      { pattern: /^\s*@\w+/, type: "decorator" },
      { pattern: /^\s*#/, type: "comment" },
   ],
   // Java/Kotlin patterns
   java: [
      { pattern: /^\s*(?:public|private|protected)?\s*(?:static)?\s*(?:\w+\s+)+(\w+)\s*\([^)]*\)\s*(?:throws\s+\w+)?\s*{/, type: "method" },
      { pattern: /^\s*(?:public|private|protected)?\s*(?:abstract|final)?\s*class\s+(\w+)/, type: "class" },
      { pattern: /^\s*(?:public|private|protected)?\s*interface\s+(\w+)/, type: "interface" },
      { pattern: /^\s*(?:public|private|protected)?\s*enum\s+(\w+)/, type: "enum" },
      { pattern: /^\s*package\s+/, type: "namespace" },
      { pattern: /^\s*import\s+/, type: "import" },
      { pattern: /^\s*@\w+/, type: "decorator" },
      { pattern: /^\s*\/\/|^\s*\/\*/, type: "comment" },
   ],
   // Rust patterns
   rust: [
      { pattern: /^\s*(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/, type: "function" },
      { pattern: /^\s*(?:pub\s+)?struct\s+(\w+)/, type: "struct" },
      { pattern: /^\s*(?:pub\s+)?enum\s+(\w+)/, type: "enum" },
      { pattern: /^\s*(?:pub\s+)?trait\s+(\w+)/, type: "interface" },
      { pattern: /^\s*(?:pub\s+)?type\s+(\w+)/, type: "type" },
      { pattern: /^\s*(?:pub\s+)?mod\s+(\w+)/, type: "module" },
      { pattern: /^\s*impl\s+/, type: "class" },
      { pattern: /^\s*use\s+/, type: "import" },
      { pattern: /^\s*#\[/, type: "decorator" },
      { pattern: /^\s*\/\/|^\s*\/\*/, type: "comment" },
   ],
   // Go patterns
   go: [
      { pattern: /^\s*func\s+(?:\([^)]*\)\s*)?(\w+)/, type: "function" },
      { pattern: /^\s*type\s+(\w+)\s+struct/, type: "struct" },
      { pattern: /^\s*type\s+(\w+)\s+interface/, type: "interface" },
      { pattern: /^\s*type\s+(\w+)/, type: "type" },
      { pattern: /^\s*package\s+(\w+)/, type: "namespace" },
      { pattern: /^\s*import\s+/, type: "import" },
      { pattern: /^\s*\/\/|^\s*\/\*/, type: "comment" },
   ],
}

// Alias mappings for language detection results
const LANG_ALIASES: Record<string, string> = {
   typescript: "ts", ts: "ts", tsx: "ts",
   javascript: "ts", js: "ts", jsx: "ts",
   cpp: "cpp", "c++": "cpp", c: "cpp", h: "cpp", hpp: "cpp",
   python: "py", py: "py",
   java: "java", kotlin: "java", kt: "java",
   rust: "rust", rs: "rust",
   go: "go", golang: "go",
}

function getIndent(line: string): number {
   const match = line.match(/^(\s*)/)
   if (!match) return 0
   const spaces = match[1]
   // Count tabs as 4 spaces
   return spaces.replace(/\t/g, "    ").length
}

function classifyLine(line: string, lang: string): { type: CodeBlockType, name: string } {
   const patterns = PATTERNS[lang] || PATTERNS.ts
   for (const { pattern, type } of patterns) {
      const match = line.match(pattern)
      if (match) {
         return { type, name: match[1] || "" }
      }
   }
   return { type: "unknown", name: "" }
}

function isBlockStart(line: string): boolean {
   const trimmed = line.trim()
   return trimmed.endsWith("{") || trimmed.endsWith(":") || trimmed.endsWith("(")
}

function isSignificantLine(line: string): boolean {
   const trimmed = line.trim()
   return trimmed.length > 0 && !trimmed.startsWith("//") && !trimmed.startsWith("#") && !trimmed.startsWith("*")
}

export function segmentCode(text: string, lang?: string): SemanticUnit {
   const lines = text.split(/\r?\n/)
   const normalizedLang = lang ? (LANG_ALIASES[lang.toLowerCase()] || "ts") : "ts"

   const root: CodeBlock = {
      type: "block",
      name: "root",
      indent: -1,
      startLine: 0,
      endLine: lines.length - 1,
      content: [],
      children: []
   }

   const stack: CodeBlock[] = [root]
   let currentBlock: CodeBlock = root
   let i = 0

   while (i < lines.length) {
      const line = lines[i]
      const indent = getIndent(line)
      const trimmed = line.trim()

      // Skip empty lines
      if (!trimmed) {
         currentBlock.content.push(line)
         i++
         continue
      }

      // Check if this line starts a new block
      const { type, name } = classifyLine(line, normalizedLang)
      const startsBlock = isBlockStart(line) || type !== "unknown"

      if (startsBlock && type !== "comment" && type !== "import" && type !== "decorator") {
         // Pop stack until we find a parent with less indentation
         while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
            stack.pop()
         }

         const newBlock: CodeBlock = {
            type,
            name,
            indent,
            startLine: i,
            endLine: i,
            content: [line],
            children: []
         }

         stack[stack.length - 1].children.push(newBlock)
         stack.push(newBlock)
         currentBlock = newBlock
      } else {
         // Add to current block
         currentBlock.content.push(line)
         currentBlock.endLine = i
      }

      i++
   }

   return convertToSectionUnit(root, true)
}

function convertToSectionUnit(block: CodeBlock, isRoot: boolean): SemanticUnit {
   const content: SemanticUnit[] = []

   // Collect lines not in children blocks
   const childRanges = block.children.map(c => ({ start: c.startLine, end: c.endLine }))
   let textContent = ""

   for (let i = 0; i < block.content.length; i++) {
      const lineIdx = block.startLine + i
      const inChild = childRanges.some(r => lineIdx >= r.start && lineIdx <= r.end)
      if (!inChild) {
         textContent += block.content[i] + "\n"
      }
   }

   textContent = textContent.trim()
   if (textContent && block.children.length === 0) {
      // Leaf node: return as TextualUnit
      return TextualUnit.New(block.content.join("\n"), "code")
   }

   if (textContent) {
      content.push(TextualUnit.New(textContent, "code"))
   }

   // Add children
   for (const child of block.children) {
      content.push(convertToSectionUnit(child, false))
   }

   if (isRoot && !block.name) {
      if (content.length === 1) return content[0]
      return SectionUnit.New(SectionLayout.Code, null, content)
   }

   const layout = getLayoutForType(block.type)
   const label = block.name ? TextualUnit.New(`${block.type}: ${block.name}`) : null

   return SectionUnit.New(layout, label, content.length > 0 ? content : [TextualUnit.New(block.content.join("\n"), "code")])
}

function getLayoutForType(type: CodeBlockType): SectionLayout {
   switch (type) {
      case "function":
      case "method":
      case "constructor":
         return SectionLayout.CodeFunction
      case "class":
      case "interface":
      case "type":
      case "enum":
      case "struct":
      case "namespace":
      case "module":
         return SectionLayout.CodeDefinition
      case "variable":
      case "constant":
         return SectionLayout.CodeData
      default:
         return SectionLayout.Code
   }
}
