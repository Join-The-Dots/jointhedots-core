import { Transformer, $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown';
import { EditorState, $getRoot, ElementNode } from 'lexical';
import { TRANSFORMERS } from '@lexical/markdown';
import * as yaml from "js-yaml"
import { MARKDOWN_TRANSFORMERS } from 'lexical-editor/plugins/MarkdownTransformers';

const COMPONENT_TRANSFORMER: Transformer = {
   type: "element",
   export(node: ElementNode) {
      const type = node.getType()
      const data = node.exportJSON()
      if (type !== "paragraph") {
         console.log("Not handled", node)
         return "```view " + data.type + '\n' + yaml.dump({
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

const markdownTransformers: typeof TRANSFORMERS = [
   COMPONENT_TRANSFORMER,
   ...TRANSFORMERS,
   ...MARKDOWN_TRANSFORMERS,
]

export function transformEditorStateToMarkdown(editorState: EditorState, shouldPreserveNewLinesInMarkdown = true): string {
   return editorState.read(() => {
      return $convertToMarkdownString(
         markdownTransformers,
         $getRoot(), //node
         shouldPreserveNewLinesInMarkdown,
      )
   })
}

export function $updateEditorStateFromMarkdown(markdown: string, shouldPreserveNewLinesInMarkdown = true) {
   $convertFromMarkdownString(
      markdown,
      MARKDOWN_TRANSFORMERS,
      $getRoot(), //node
      shouldPreserveNewLinesInMarkdown,
   );
}
