import { Transformer, $convertFromMarkdownString, $convertToMarkdownString, ElementTransformer, TextMatchTransformer, CHECK_LIST, ELEMENT_TRANSFORMERS, MULTILINE_ELEMENT_TRANSFORMERS, TEXT_FORMAT_TRANSFORMERS, TEXT_MATCH_TRANSFORMERS } from '@lexical/markdown'
import { EditorState, $getRoot, ElementNode, $applyNodeReplacement, LexicalNode } from 'lexical'
import { deserialize_jsx_document, stringify_node_jsx } from '@livedoc/core/ast/serde/markdown'
import { ComponentNode } from '../nodes/Component/ComponentNode'
import * as AST from "@livedoc/core/ast/nodes"
import { evaluateJSXElementData } from '@livedoc/core/ast/evaluate'

export const MARKDOWN_TRANSFORMERS: Transformer[] = [
   CHECK_LIST,
   ...ELEMENT_TRANSFORMERS,
   ...MULTILINE_ELEMENT_TRANSFORMERS,
   ...TEXT_FORMAT_TRANSFORMERS,
   ...TEXT_MATCH_TRANSFORMERS,
]

export function registerMarkdownTransformer(transformer: TextMatchTransformer | ElementTransformer) {
   MARKDOWN_TRANSFORMERS.unshift(transformer)
}

export function exportAstToMarkdown(node: LexicalNode) {
   if (node["exportAST"] instanceof Function) {
      const ast = node["exportAST"]()
      return stringify_node_jsx(ast)
   }
}

export function transformEditorStateToMarkdown(editorState: EditorState, shouldPreserveNewLinesInMarkdown = true): string {

   const COMPONENT_TRANSFORMER: Transformer = {
      type: "element",
      export: exportAstToMarkdown,
      replace: null,
      regExp: null,
      dependencies: [ElementNode],
   }

   const markdownTransformers: typeof MARKDOWN_TRANSFORMERS = [
      COMPONENT_TRANSFORMER,
      ...MARKDOWN_TRANSFORMERS,
   ]

   const content = editorState.read(() => {
      return $convertToMarkdownString(
         markdownTransformers,
         $getRoot(), //node
         shouldPreserveNewLinesInMarkdown,
      )
   })

   return content
}

export function $updateEditorStateFromMarkdown(content: string, shouldPreserveNewLinesInMarkdown = true) {
   const ast = deserialize_jsx_document(content)

   const layout = ast.layout as AST.LDXDocument

   const COMPONENT_TRANSFORMER: Transformer = {
      type: "element",
      export: () => null,
      replace: (parentNode, chilren, match, isImport) => {
         const index = parseInt(match[1])
         const descriptor = evaluateJSXElementData(layout.items[index] as any)
         const node = new ComponentNode(descriptor)
         parentNode.replace(node)
      },
      regExp: /\x00([0-9]+)\x01/,
      dependencies: [],
   }

   const markdownTransformers: typeof MARKDOWN_TRANSFORMERS = [
      COMPONENT_TRANSFORMER,
      ...MARKDOWN_TRANSFORMERS,
   ]

   const markdown = layout.items.map((chunk, i) => {
      if (chunk instanceof Object) {
         return `\x00${i}\x01`
      }
      else {
         return chunk
      }
   }).join("\n")

   $convertFromMarkdownString(
      markdown,
      markdownTransformers,
      $getRoot(), //node
      shouldPreserveNewLinesInMarkdown,
   )
}
