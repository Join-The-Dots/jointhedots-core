import languageDetection from "@vscode/vscode-languagedetection"
import { SemanticUnit, TextualUnit } from "../semantic/units"
import { segmentMarkdown } from "./markdown"
import { segmentIndenticCode } from "./indentic"

export type TextFormat = "md" | "html" | string

// Languages that should use code segmentation
const CODE_LANGUAGES = new Set([
   "ts", "typescript", "tsx",
   "js", "javascript", "jsx",
   "cpp", "c++", "c", "h", "hpp",
   "py", "python",
   "java", "kotlin", "kt",
   "rust", "rs",
   "go", "golang",
   "cs", "csharp",
   "php",
   "rb", "ruby",
   "swift",
   "scala",
])

let detector: languageDetection.ModelOperations | null = null

async function getDetector(): Promise<languageDetection.ModelOperations> {
   if (!detector) {
      detector = new languageDetection.ModelOperations()
   }
   return detector
}

export async function detectFormat(text: string): Promise<TextFormat> {
   const ops = await getDetector()
   const results = await ops.runModel(text)
   return results.length > 0 ? results[0].languageId : undefined
}

export async function segmentText(unit: TextualUnit, format?: TextFormat): Promise<SemanticUnit> {
   const text = unit.text
   if (!text?.trim()) return unit

   let detected = format || unit.format || await detectFormat(text)

   // Check if it's a code language
   if (detected && CODE_LANGUAGES.has(detected.toLowerCase())) {
      return segmentIndenticCode(text)
   }

   switch (detected) {
      case "md": return segmentMarkdown(text)
      default: return unit
   }
}
