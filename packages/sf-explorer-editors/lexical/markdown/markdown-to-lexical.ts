import { Transformer, $convertFromMarkdownString, $convertToMarkdownString, ElementTransformer, TextMatchTransformer, CHECK_LIST, ELEMENT_TRANSFORMERS, MULTILINE_ELEMENT_TRANSFORMERS, TEXT_FORMAT_TRANSFORMERS, TEXT_MATCH_TRANSFORMERS } from '@lexical/markdown'
import { EditorState, $getRoot, ElementNode, LexicalNode } from 'lexical'
import { stringify_node_jsx } from '@sf-explorer/core'
import { ComponentNode } from '../nodes/Component/ComponentNode'
import { LDXDocumentExpr, LDXElementExpr } from '@sf-explorer/core'

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

export function $updateEditorStateFromModel(xpr: LDXDocumentExpr) {

   const COMPONENT_TRANSFORMER: Transformer = {
      type: "element",
      export: () => null,
      replace: (parentNode, chilren, match, isImport) => {
         const key = match[1]
         const value = xpr.embeds.get(key)
         if (value instanceof LDXElementExpr) {
            const node = new ComponentNode(value)
            parentNode.replace(node)
         }
         else {
            // TODO: expression embeds
         }
      },
      regExp: /\x00([0-9]+)\x01/,
      dependencies: [],
   }

   const markdownTransformers: typeof MARKDOWN_TRANSFORMERS = [
      COMPONENT_TRANSFORMER,
      ...MARKDOWN_TRANSFORMERS,
   ]

   $convertFromMarkdownString(
      xpr.markdown,
      markdownTransformers,
      $getRoot(), //node
      true,
   )

   return xpr
}