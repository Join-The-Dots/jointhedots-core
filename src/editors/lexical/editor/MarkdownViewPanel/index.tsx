import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { transformEditorStateToMarkdown } from "editors/lexical/markdown/markdown-to-lexical";
import { useEffect, useState } from "react";

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

   return <pre>{markdown}</pre>
}
