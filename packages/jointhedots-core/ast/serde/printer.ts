import * as AST from "../nodes"
import * as Astring from 'astring'
import { State } from 'astring'

function ln(state: State) {
   return state.lineEnd + state.indent.repeat(state.indentLevel)
}

const printers = {
   ...Astring.GENERATOR,
   // <div></div>
   JSXElement(node: AST.JSXElement, state: State) {
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
            this[attr.type](attr, state)
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
         print_document_content(this, content, true, state)
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
   JSXAttribute(node: AST.JSXAttribute, state: State) {
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
               this[value.type](value, state)
            }
         }
         else if (value) {
            state.write('={')
            this[value.type](value, state)
            state.write('}')
         }
      }
      else {
         state.write(`{...`)
         this[value.type](value, state)
         state.write(`} `)
      }
   },
   JSXFragment(node: AST.JSXFragment, state: State) {
      const { content } = node
      state.indentLevel++
      state.write('<>\n')
      print_document_content(this, content, false, state)
      state.write('</>')
      state.indentLevel--
   },
   JSXContent(node: AST.JSXContent, state: State) {
      const { format, metadata, content } = node
      const mark = '```'
      const isInline = format === "inline"
      if (isInline) {
         state.write(`${mark}`)
      }
      else {
         state.indentLevel++
         state.write(`${mark}${format} ${metadata || ""}\n`)
      }
      for (const chunk of content) {
         if (chunk instanceof Object) {
            this[chunk.type](content, state)
         }
         else {
            state.write(chunk)
         }
      }
      if (isInline) {
         state.write(`${mark}`)
      }
      else {
         state.indentLevel--
         state.write(`\n${mark}`)
      }
   },
   JSXDocument(node: AST.JSXDocument, state: State) {
      const { items } = node
      print_document_content(this, items, true, state)
   },
   // { }
   JSXEmptyExpression() {
      // do nothingac
      // a single or multiline comment in the expression will be ignores
   },
}

function print_document_content(generator: any, content: AST.Any | AST.Any[], separate: boolean, state: State) {
   //print_html_content(generator, content, separate, state)
   print_markdown_content(generator, content, separate, state)
}

function print_html_content(generator: any, content: AST.Any | AST.Any[], separate: boolean, state: State) {
   if (Array.isArray(content)) {
      for (const element of content) {
         print_document_content(generator, element, separate, state)
      }
   }
   else if (content.type === "ArrayExpression") {
      for (const element of content.elements) {
         print_document_content(generator, element, separate, state)
      }
   }
   else if (content.type === "Literal") {
      state.write(content.value.toString())
      if (separate) state.write("\n")
   }
   else if (content.type === "JSXElement" || content.type === "JSXContent") {
      generator[content.type](content, state)
      if (separate) state.write("\n")
   }
   else {
      state.write("{")
      generator[content.type](content, state)
      state.write("}")
      if (separate) state.write("\n")
   }
}

function print_markdown_content(generator: any, content: AST.Any | AST.Any[], separate: boolean, state: State) {
   if (Array.isArray(content)) {
      for (const element of content) {
         print_document_content(generator, element, separate, state)
      }
   }
   else if (content.type === "ArrayExpression") {
      for (const element of content.elements) {
         print_document_content(generator, element, separate, state)
      }
   }
   else if (content.type === "Literal") {
      state.write(content.value.toString())
      if (separate) state.write("\n")
   }
   else if (content.type === "JSXElement") {

      // Print element with markdown style
      if (!content.attributes?.length) {
         if (content.tag === "p") {
            state.write("\n")
            print_document_content(generator, content.content, false, state)
         }
         else if (content.tag === "h1") {
            state.write("\n# ")
            print_document_content(generator, content.content, false, state)
         }
         else if (content.tag === "h2") {
            state.write("\n## ")
            print_document_content(generator, content.content, false, state)
         }
         state.write("\n")
         return
      }

      // Print element with jsx style
      generator[content.type](content, state)
      if (separate) state.write("\n")
   }
   else if (content.type === "JSXContent") {
      generator[content.type](content, state)
      if (separate) state.write("\n")
   }
   else if (content.type === "JSXDocument") {
      print_markdown_content(generator, content.items, false, state)
   }
   else {
      state.write("{")
      generator[content.type](content, state)
      state.write("}")
      if (separate) state.write("\n")
   }
}

const DocGenerator = {
   generator: printers,
   ecmaVersion: 2024,
   sourceType: 'module',
   documentFormat: "html"
}

export function stringify_node_jsx(n: AST.Any): string {
   return Astring.generate(n as any, DocGenerator as any)
}

export function stringify_document(n: AST.Any): string {
   return Astring.generate(n as any, DocGenerator as any)
}
