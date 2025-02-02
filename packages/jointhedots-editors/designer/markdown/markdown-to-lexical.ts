import { Transformer, $convertFromMarkdownString, $convertToMarkdownString, ElementTransformer, TextMatchTransformer, CHECK_LIST, ELEMENT_TRANSFORMERS, MULTILINE_ELEMENT_TRANSFORMERS, TEXT_FORMAT_TRANSFORMERS, TEXT_MATCH_TRANSFORMERS } from '@lexical/markdown'
import { EditorState, $getRoot, ElementNode, LexicalNode } from 'lexical'
import { ComponentNode } from '../nodes/Component/ComponentNode'
import { DXDocumentLayout, DXDisplay } from '@jointhedots/core'
import { stringify_document } from '@jointhedots/core/ast/serde/printer'

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
      try {
         const ast = node["exportAST"]()
         return stringify_document(ast)
      }
      catch (e) {
         return `\`\`\`json\n// ! Invalid component:\n ${JSON.stringify(node.exportJSON(), null, 2)}\`\`\``
      }
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

export function $updateEditorStateFromModel(layout: DXDocumentLayout) {

   const COMPONENT_TRANSFORMER: Transformer = {
      type: "element",
      export: () => null,
      replace: (parentNode, chilren, match, isImport) => {
        /*  const key = match[1]
         const value = layout.embeds[key]
         if (value instanceof DXDisplay) {
            const node = new ComponentNode(layout, key)
            parentNode.replace(node)
         }
         else {
            // TODO: expression embeds
         } */
      },
      regExp: /\x00([0-9]+)\x01/,
      dependencies: [],
   }

   const markdownTransformers: typeof MARKDOWN_TRANSFORMERS = [
      COMPONENT_TRANSFORMER,
      ...MARKDOWN_TRANSFORMERS,
   ]

   /* $convertFromMarkdownString(
      layout.markdown,
      markdownTransformers,
      $getRoot(), //node
      true,
   ) */
   throw new Error("TODO")
   return layout
}