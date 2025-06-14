import * as ACorn from "acorn"
import * as AString from "astring"
import { MapLike } from "../common/types"
import { evaluateExpression, InterpreterScope, LocalScope } from "./interpreter"

export enum EmbedSyntax {
   DollarBracket,  // Embed: $(expr)  | Escaping: \$(expr)
   DollarCurly,    // Embed: ${expr}  | Escaping: \${expr}
   CurlyCurly,     // Embed: {{expr}} | Escaping: \{{expr}}
}

export type TextContext = {
   vars: { [key: string]: any }
   encoder?: (value: any) => string
}

export class TextBinding {
   constructor(
      public start: number,
      public end: number,
      public node: ACorn.AnyNode,
   ) {
   }
   evaluate(scope: InterpreterScope) {
      return evaluateExpression(this.node, scope)
   }
   toString() {
      return AString.generate(this.node)
   }
}

export class TextTemplate {
   constructor(
      public pattern: string,
      public bindings: MapLike<TextBinding>,
      public issues: Error[],
   ) {
   }
   evaluate(context: TextContext): string {
      const { pattern, bindings } = this
      const scope = new LocalScope(null, null, context.vars)

      let text = pattern
      const encoder = context.encoder || defaultTextEncoder
      for (const key in bindings) {
         const binding = bindings[key]
         try {
            let value = binding.evaluate(scope)
            text = text.replace(key, encoder(value))
         }
         catch (e) {
            const code = AString.generate(binding.node)
            console.log(`Invalid binding '${code}':`, e)
            throw new Error(`Invalid binding '${code}': ${e.message}`)
         }
      }
      return text
   }
   getBindingAt(position: number): TextBinding {
      for (const key in this.bindings) {
         const binding = this.bindings[key]
         if (position >= binding.start && position < binding.end) {
            return binding
         }
      }
      return null
   }
   toString() {
      let { pattern, bindings } = this
      let text = pattern
      for (const key in bindings) {
         const binding = bindings[key]
         text = text.replace(key, binding.toString())
      }
      return text
   }
}

export type PlaceholderGenerator = (text: string) => (index: number) => string

function createSyntaxStyle(startToken: string, endToken: string, escapeChar: string) {
   return {
      startToken,
      endToken,
      escapeChar,
      escapeCode: escapeChar.charCodeAt(0),
   }
}

const embedSyntaxStyles = [
   createSyntaxStyle("$(", ")", "\\"), // DollarBracket
   createSyntaxStyle("${", "}", "\\"), // DollarCurly
   createSyntaxStyle("{{", "}}", "\\"), // CurlyCurly
]

export function parseTextTemplate(code: string, syntax: EmbedSyntax, placeholder: PlaceholderGenerator = defaultPlaceholderGen): TextTemplate {
   const { startToken, endToken, escapeCode } = embedSyntaxStyles[syntax]
   const options: ACorn.Options = { ecmaVersion: 2020 }

   const bindings: MapLike<TextBinding> = {}
   const binding_placeholder = placeholder(code)
   let binding_count = 0

   const issues: Error[] = []
   const chunks = []
   let chunk_start = 0
   let cur_pos = 0
   while (true) {

      // Next embed
      cur_pos = code.indexOf(startToken, cur_pos)
      if (cur_pos < 0) break

      // Parse embed
      if (code.charCodeAt(cur_pos - 1) === escapeCode) {
         chunks.push(code.slice(chunk_start, cur_pos - 1), startToken)
         chunk_start = cur_pos = cur_pos + startToken.length
      }
      else {
         try {
            const ast = ACorn.parseExpressionAt(code, cur_pos + startToken.length, options)
            const embed_end = code.indexOf(endToken, ast.end)
            if (embed_end > 0 && code.slice(ast.end, embed_end).trim() === "") {
               const placeholder = binding_placeholder(binding_count)
               bindings[placeholder] = new TextBinding(ast.start, ast.end, ast)
               chunks.push(code.slice(chunk_start, cur_pos), placeholder)
               chunk_start = cur_pos = embed_end + endToken.length
               binding_count++
            }
            else {
               throw new Error(`Embedding shall end with '${endToken}'`)
            }
         }
         catch (e) {
            issues.push(e)
            cur_pos++
         }
      }
   }
   chunks.push(code.slice(chunk_start, code.length))

   const pattern = chunks.join("")
   return new TextTemplate(pattern, bindings, issues)
}

function defaultPlaceholderGen(text: string) {
   let binding_mark = "$"
   while (text.includes(binding_mark)) binding_mark += "_"
   return (index: number): string => {
      return binding_mark + index
   }
}

function defaultTextEncoder(value: any): string {
   if (value === undefined) return ""
   if (value === null) return ""
   return value.toString()
}
