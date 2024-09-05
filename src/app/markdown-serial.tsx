import React from "react"
import { Remark } from "react-remark"
import { unified } from "unified"
import RemarkParse from "remark-parse"
import RemarkStringify from "remark-stringify"
import RemarkFrontmatter from "remark-frontmatter"
import { ASTFlow, ASTNode } from "core/ast"
import * as yaml from "js-yaml"

export interface AstMarkdown extends ASTNode {
   type: "std:markdown"
   blocks: (ASTNode | string)[]
}

export function serialize_model_markdown(model: ASTFlow): string {
   const layout = model.layout as AstMarkdown
   if (layout.type !== "std:markdown") {
      throw new Error("Only std:markdown layout can be render to markdown")
   }

   const children: any[] = []

   const data = { type: "dataflow", ...model, layout: undefined }
   if (Object.keys(data).length > 2) {
      children.push({
         type: "yaml",
         value: yaml.dump(data),
      })
   }

   const parser = unified().use(RemarkParse)
   for (const block of layout.blocks) {
      if (typeof block !== "string") {
         children.push({
            "type": "code",
            "lang": "display",
            "meta": block.type,
            "value": yaml.dump({ ...block, type: undefined })
         })
      }
      else {
         children.push(...parser.parse(block).children)
      }
   }

   const generator = unified()
      .use(RemarkStringify)
      .use(RemarkFrontmatter)

   return generator.stringify({
      type: "root",
      children,
   })
}

export function deserialize_model_markdown(bytes: string): ASTFlow {
   const parser = unified()
      .use(RemarkParse)
      .use(RemarkFrontmatter)

   const root = parser.parse(bytes)
   const data = root.children.shift()

   console.log(root.children, data)
   const blocks = []
   const generator = unified().use(RemarkStringify)
   for (const child of root.children) {
      if (child.type === "code" && child.lang === "display") {
         blocks.push(Object.assign({
            type: child.meta,
         }, yaml.load(child.value)))
      }
      else {
         blocks.push(generator.stringify(child as any))
      }
   }
   const layout = {
      type: "std:markdown",
      blocks,
   } as AstMarkdown

   console.log(layout)
   return {
      type: "flow",
      layout,
   }
}

export function MarkdownModelDisplayer(props: {
   children: string
}) {
   return <Remark remarkPlugins={[RemarkFrontmatter]}>
      {props.children}
   </Remark>
}
