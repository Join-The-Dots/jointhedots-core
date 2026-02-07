import * as AString from 'astring'
import * as  AST from '../primitives'
import { BlockFormat } from '../primitives'

type ElementPrinters = Record<string, (generator: Generator, element: AST.ElementPrimitive, state: State) => void>

type State = AString.State & {
   generator: AString.Generator
   elementPrinters?: ElementPrinters
}

function ln(state: State) {
   return state.lineEnd + state.indent.repeat(state.indentLevel)
}

const GENERATOR = {
   ...AString.GENERATOR,
   // <div></div>
   ElementPrimitive(node: AST.ElementPrimitive, state: State) {
      const { tag, content, attributes } = node
      let multiline = false
      state.write('<')
      state.write(tag)

      if (attributes) {
         let len = 0
         const items = []
         const prev_output = state.output
         state.indentLevel++
         for (const attr of attributes) {
            state.output = ""
            state.generator["ElementAttribute"](attr, state)
            items.push(state.output)
            len += state.output.length + 1
         }
         state.output = prev_output
         multiline = len > 200
         if (multiline) {
            const _ln = ln(state)
            state.write(`${_ln}${items.join(_ln)}`)
         }
         else {
            state.write(` ${items.join(" ")}`)
         }
         state.indentLevel--
      }

      if (content) {
         state.write('>\n')
         state.indentLevel++
         print_document_content(content, true, state)
         state.indentLevel--
         state.write(`</${tag}>`)
      } else if (multiline) {
         state.write(`${ln(state)}/>`)
      } else {
         state.write(` />`)
      }
   },
   // name="something"
   // {...prop}
   // {...prop.v}
   // {...func()}
   ElementAttribute(node: AST.ElementAttribute, state: State) {
      const { name, ns: namespace, value } = node
      if (name) {
         if (namespace) {
            state.write(namespace)
            state.write(":")
         }
         state.write(name)
         if (value.type === "Literal") {
            if (value.value !== true) {
               state.write('=')
               state.generator[value.type](value as any, state)
            }
         }
         else if (value) {
            state.write('={')
            state.generator[value.type](value, state)
            state.write('}')
         }
      }
      else {
         state.write(`{...`)
         state.generator[value.type](value, state)
         state.write(`} `)
      }
   },
   Block(node: AST.BlockPrimitive, state: State) {
      const { format, lang, metadata, content } = node
      if (format === BlockFormat.Fragment) {
         state.indentLevel++
         state.write('<>\n')
         renderContent()
         state.write('</>')
         state.indentLevel--
      }
      else if (lang === "inline") {
         const mark = '```'
         state.write(`${mark}`)
         renderContent()
         state.write(`${mark}`)
      }
      else {
         const mark = '```'
         state.indentLevel++
         state.write(`${mark}${format} ${metadata || ""}\n`)
         renderContent()
         state.indentLevel--
         state.write(`\n${mark}`)
      }
      function renderContent() {
         for (const chunk of content) {
            if (chunk instanceof Object) {
               state.generator[chunk.type](content, state)
            }
            else {
               state.write(chunk)
            }
         }
      }
   },
   // { }
   JSXEmptyExpression() {
      // do nothingac
      // a single or multiline comment in the expression will be ignores
   },
}

function print_document_content(content: AST.Any | AST.Any[], multiline: boolean, state: State) {
   if (Array.isArray(content)) {
      for (const element of content) {
         print_document_content(element, multiline, state)
      }
   }
   else if (content.type === "ArrayExpression") {
      for (const element of content.elements) {
         print_document_content(element, multiline, state)
      }
   }
   else if (content.type === "Literal") {
      state.write(content.value.toString())
      if (multiline) state.write("\n")
   }
   else if (content.type === "Element") {
      const printer = state.generator["$ElementPrinters"][content.tag]
      if (printer && !content.attributes?.length) {
         // Print element with markdown style
         printer(content, state)
         state.write("\n")
      }
      else {
         // Print element with jsx style
         state.generator[content.type](content, state)
         if (multiline) state.write("\n")
      }
   }
   else if (content.type === "Block") {
      state.generator[content.type](content, state)
      if (multiline) state.write("\n")
   }
   else {
      state.write("{")
      state.generator[content.type](content, state)
      state.write("}")
      if (multiline) state.write("\n")
   }
}

const MarkdownElementPrinters: Record<string, (element: AST.ElementPrimitive, state: State) => void> = {
   "p": (element, state) => {
      state.write("\n")
      print_document_content(element.content, true, state)
   },
   "h1": (element, state) => {
      state.write("\n# ")
      print_document_content(element.content, false, state)
   },
   "h2": (element, state) => {
      state.write("\n## ")
      print_document_content(element.content, false, state)
   },
   "h3": (element, state) => {
      state.write("\n### ")
      print_document_content(element.content, false, state)
   },
   "hr": (element, state) => {
      state.write("\n---")
      print_document_content(element.content, false, state)
   },
}

const HtmlGenerator = {
   generator: {
      ...GENERATOR,
      $ElementPrinters: {} as any,
   },
   ecmaVersion: 2024,
   sourceType: 'module',
}

const MarkdownGenerator = {
   generator: {
      ...GENERATOR,
      $ElementPrinters: MarkdownElementPrinters as any,
   },
   ecmaVersion: 2024,
   sourceType: 'module',
}

export function stringify_node_jsx(n: AST.Any): string {
   return AString.generate(n as any, MarkdownGenerator)
}

export function stringify_document(n: AST.Any): string {
   return AString.generate(n as any, MarkdownGenerator)
}
