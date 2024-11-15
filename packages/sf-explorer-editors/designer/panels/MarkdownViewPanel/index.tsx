import { ViewEditor } from '../../editor'
import { PanelComponent, PanelDescriptor } from '@sf-explorer/editors/ui/FeaturesLayout'
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { transformEditorStateToMarkdown } from "@sf-explorer/editors/designer/markdown/markdown-to-lexical";
import { MonacoEditorHOC, StandardLanguageProvider } from "@sf-explorer/editors/ui/MonacoEditorHOC";
import { useEffect, useState } from "react";

const EditorMarkdown = MonacoEditorHOC(new StandardLanguageProvider<void>("markdown"))

function MarkdownViewPlugin() {
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

export class MarkdownViewPanel extends PanelComponent<ViewEditor> {
   static descriptor: PanelDescriptor = {
      layouting: "flexible",
      defaultTitle: "MDX",
      defaultIcon: "bi:markdown",
      defaultDockId: "right",
   }
   render() {
      return <MarkdownViewPlugin />
   }
}
