import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { transformEditorStateToMarkdown } from "@sf-explorer/editors/lexical/markdown/markdown-to-lexical";
import { MonacoEditorHOC, StandardLanguageProvider } from "@sf-explorer/editors/ui/MonacoEditorHOC";
import { useEffect, useState } from "react";

export const EditorMarkdown = MonacoEditorHOC(new StandardLanguageProvider<void>("markdown"))

export function MarkdownViewPlugin() {
   const [editor] = useLexicalComposerContext();
   const [markdown, setMarkdown] = useState(transformEditorStateToMarkdown(editor.getEditorState()))

   useEffect(() => {
      const unregisterCommandListeners = new Set<() => void>();
      unregisterCommandListeners.add(
         editor.registerUpdateListener(() => {
            setMarkdown(transformEditorStateToMarkdown(editor.getEditorState()))
         }),
      );
      return () =>
         unregisterCommandListeners.forEach((unregister) => unregister());
   }, [editor]);

   return <EditorMarkdown className="editor-panel" value={markdown} />
}
