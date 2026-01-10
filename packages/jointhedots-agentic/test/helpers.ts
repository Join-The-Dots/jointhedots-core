import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { SemanticUnit } from '../src/services/semantic/units'

export function setupResultDir(dir: string) {
   rmSync(dir, { recursive: true, force: true })
   mkdirSync(dir, { recursive: true })
}

export function trace(dir: string, name: string, origin: string, result: SemanticUnit) {
   const output = `${origin}\n\n---\n\n${JSON.stringify(result, null, 2)}`
   writeFileSync(join(dir, `${name}.txt`), output, 'utf-8')
}

export function countSegments(unit: SemanticUnit): number {
   if (!unit) return 0
   if ('content' in unit && Array.isArray((unit as any).content)) {
      return 1 + (unit as any).content.reduce((sum: number, c: SemanticUnit) => sum + countSegments(c), 0)
   }
   return 1
}
