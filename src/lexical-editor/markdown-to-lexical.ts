import { Transformer, $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown'
import { EditorState, $getRoot, ElementNode, $applyNodeReplacement } from 'lexical'
import { TRANSFORMERS } from '@lexical/markdown'
import { MARKDOWN_TRANSFORMERS } from 'lexical-editor/plugins/MarkdownTransformers'
import { deserialize_jsx_document } from '../core/ast/serde/markdown'
import { ComponentNode } from './nodes/Component/ComponentNode'
import * as AST from "core/ast/nodes"
import { evaluateJSXElementData } from 'core/ast/evaluate'

export function transformEditorStateToMarkdown(editorState: EditorState, shouldPreserveNewLinesInMarkdown = true): string {

   const COMPONENT_TRANSFORMER: Transformer = {
      type: "element",
      export(node: ElementNode) {
         if (node instanceof ComponentNode) {
            return node.generateJSX()
         }
      },
      replace: null,
      regExp: null,
      dependencies: [ComponentNode],
   }

   const markdownTransformers: typeof TRANSFORMERS = [
      COMPONENT_TRANSFORMER,
      ...TRANSFORMERS,
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

   const layout = ast.layout as AST.LiveDocument

   const COMPONENT_TRANSFORMER: Transformer = {
      type: "element",
      export: () => null,
      replace: (parentNode, chilren, match, isImport) => {
         const index = parseInt(match[1])
         const descriptor = evaluateJSXElementData(layout.items[index] as any)
         console.log("component", descriptor)

         const node = (new ComponentNode(descriptor))
         //const node = $createCodeNode(descriptor.tag)
         parentNode.replace(node)
      },
      regExp: /\x00([0-9]+)\x01/,
      dependencies: [],
   }

   const markdownTransformers: typeof TRANSFORMERS = [
      COMPONENT_TRANSFORMER,
      ...TRANSFORMERS,
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
