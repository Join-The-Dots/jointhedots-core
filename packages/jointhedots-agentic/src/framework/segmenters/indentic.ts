import { SectionLayout, SectionUnit, SemanticUnit, TextualUnit } from "../semantic/units"

interface IndenticSegment {
   line: number
   level: number
   children: IndenticSegment[]
}

interface IndenticSegmentation {
   lines: string[]
   spaceSize: number
   indentLevels: number[]
}

const defaultIndentSize = 4

function analyzeIndentation(text: string): IndenticSegmentation {
   const lines = text.split(/\r?\n/).map(x => x.trimEnd())

   // Collect all leading whitespace counts from non-empty lines
   const indentations: number[] = []
   for (const line of lines) {
      if (line.length > 0) {
         const spaceCount = (line.match(/^(\s*)/)?.[1] ?? '').length
         if (spaceCount > 0) indentations.push(spaceCount)
      }
   }

   // Detect indentation size using GCD of all indentation values
   const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
   const spaceSize = indentations.length > 0
      ? indentations.reduce((acc, val) => gcd(acc, val))
      : defaultIndentSize

   // Calculate indentation level for each line
   const indentLevels: number[] = []
   let curIndentLevel = 0
   for (const line of lines) {
      if (line.length > 0) {
         const leadingSpace = line.match(/^(\s*)/)?.[1] ?? ''
         let indentSize = 0
         for (const char of leadingSpace) {
            if (char === '\t') indentSize += spaceSize
            else indentSize++
         }
         curIndentLevel = Math.floor(indentSize / spaceSize)
      }
      indentLevels.push(curIndentLevel)
   }

   return { lines, spaceSize, indentLevels }
}

function buildSegments(levels: number[], start: number, end: number, base: number): IndenticSegment[] {
   const segments: IndenticSegment[] = []
   for (let i = start; i < end;) {
      if (levels[i] < base) { i++; continue }
      const segStart = i++
      while (i < end && levels[i] > levels[segStart]) i++
      segments.push({
         line: segStart,
         level: levels[segStart],
         children: buildSegments(levels, segStart + 1, i, levels[segStart] + 1)
      })
   }
   return segments
}

function toUnit(segments: IndenticSegment[], lines: string[]): SemanticUnit {
   if (segments.length === 0) return TextualUnit.New("")
   if (segments.length === 1 && segments[0].children.length === 0)
      return TextualUnit.New(lines[segments[0].line])

   const children = []
   let lastText: TextualUnit = null
   for (const s of segments) {
         if (lastText) {
            lastText.text += "\n" + lines[s.line]
         }
         else {
            lastText = TextualUnit.New(lines[s.line])
            children.push(lastText)
         }
      if (s.children.length > 0) {
         children.push(SectionUnit.New(SectionLayout.Code, null, s.children.map(c => toUnit([c], lines))))
         lastText = null
      }
   }
   return children.length === 1 ? children[0] : SectionUnit.New(SectionLayout.Code, null, children)
}

export function segmentIndenticCode(text: string): SemanticUnit {
   const { lines, indentLevels } = analyzeIndentation(text)
   const segments = buildSegments(indentLevels, 0, lines.length, 0)
   return toUnit(segments, lines)
}
