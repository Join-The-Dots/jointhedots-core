import { listOneOrMany, OneOrMany } from "../../common/types"
import { DataUnit, FeedbackUnit, SectionLayout, SectionUnit, SemanticUnit, TabularUnit, TextualUnit } from "./units"
import { Json } from "./resource"
import { segmentText } from "../segmenters/generic"

class TransformToTextContext {
   headingLevel: number = 0
   generateParts(unit: SectionUnit): {
      label: string
      label_lines: string[]
      content: string
      content_lines: string[]
   } {
      const label = transformUnitsToText(unit.label, this)
      const label_lines = label.split(/\r?\n/g)
      const content = transformUnitsToText(unit.content, this)
      const content_lines = content.split(/\r?\n/g)
      return { label, label_lines, content, content_lines }
   }
}

function printUnitToText(unit: SemanticUnit, stream: string[], ctx: TransformToTextContext) {
   if (unit.transcript) {
      const text = unit.transcript?.text
      if (text) stream.push(text, " ")
   }
   else if (unit instanceof TextualUnit) {
      stream.push(unit.text, " ")
   }
   else if (unit instanceof DataUnit) {
      stream.push("\n\`\`\`json\n", JSON.stringify(unit.data, null, 2), "\n\`\`\`\n")
   }
   else if (unit instanceof SectionUnit) {
      printSectionToText(unit, stream, ctx)
   }
}

function printSectionToText(unit: SectionUnit, chunks: string[], ctx: TransformToTextContext) {
   if (unit.layout == SectionLayout.Documentation) {
      ctx.headingLevel++
      const { label_lines, content } = ctx.generateParts(unit)
      const headingTag = "#".repeat(ctx.headingLevel) + " "
      chunks.push("\n", ...label_lines.map(l => headingTag + l), "\n", content, "\n")
   }
   else if (unit.layout == SectionLayout.Code) {
      const { content } = ctx.generateParts(unit)
      chunks.push("\n\`\`\`", unit.language || "", "\n", content, "\n\`\`\`\n")
   }
   else {
      const { label, content } = ctx.generateParts(unit)
      chunks.push("\n[", label, "] ", content, "\n")
   }
}
export function transformTextToUnits(text: string, format?: string): Promise<OneOrMany<SemanticUnit>> {
   return segmentText(TextualUnit.New(text), format)
}

export function transformUnitsToText(unit: OneOrMany<SemanticUnit>, ctx?: TransformToTextContext): string {
   const stream = []
   if (!ctx) ctx = new TransformToTextContext()
   for (const item of listOneOrMany(unit)) {
      printUnitToText(item, stream, ctx)
   }
   return stream.join("").trim()
}

export function transformUnitToData(unit: OneOrMany<SemanticUnit>): Json {
   
   function transformToData(unit: SemanticUnit): Json {
      if (unit instanceof TextualUnit) {
         return unit.text
      }
      else if (unit instanceof DataUnit) {
         return unit.data
      }
      else if (unit instanceof TabularUnit) {
         return transformUnitsToText(unit)
      }
      else if (unit instanceof SectionUnit) {
         return transformUnitsToText(unit)
      }
      else if (unit instanceof FeedbackUnit) {
         return transformUnitToData(unit.output)
      }
      else if (unit.transcript) {
         return unit.transcript?.text
      }
      return undefined
   }

   if (Array.isArray(unit)) {
      return unit.map(transformToData).filter(x => x != undefined)
   }
   else {
      return transformToData(unit)
   }
}
