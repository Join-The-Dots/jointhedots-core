import { Transformer, $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown';
import { EditorState, $getRoot, ElementNode } from 'lexical';
import { TRANSFORMERS } from '@lexical/markdown';
import * as yaml from "js-yaml"
import { MARKDOWN_TRANSFORMERS } from './plugins/MarkdownTransformers';

const CUSTOM_COMPONENT_TRANSFORMER: Transformer = {
   type: "element",
   export(node: ElementNode) {
      const type = node.getType()
      const data = node.exportJSON()
      if (type !== "paragraph") {
         console.log("Not handled", node)
         return "```" + data.type + '\n' + yaml.dump({
            ...data,
            type: undefined,
            version: undefined,
            format: data.format || undefined,
            indent: data.indent || undefined,
            direction: data.direction || undefined,
         }) + "```"
      }
   },
   replace: null,
   regExp: null,
   dependencies: [],
};

export function transformEditorStateToMarkdown(editorState: EditorState, shouldPreserveNewLinesInMarkdown = true): string {
   return editorState.read(() => {
      const markdownTransformers: typeof TRANSFORMERS = [
         ...TRANSFORMERS,     // Heading, List, Quote, etc.
         ...MARKDOWN_TRANSFORMERS,
         CUSTOM_COMPONENT_TRANSFORMER,
      ]
      return $convertToMarkdownString(
         markdownTransformers,
         $getRoot(), //node
         shouldPreserveNewLinesInMarkdown,
      )
   })
}

export function updateEditorStateFromMarkdown(editorState: EditorState, markdown: string, shouldPreserveNewLinesInMarkdown = true) {
   return editorState.read(() => {
      $convertFromMarkdownString(
         markdown,
         MARKDOWN_TRANSFORMERS,
         $getRoot(), //node
         shouldPreserveNewLinesInMarkdown,
      );
   })
}
