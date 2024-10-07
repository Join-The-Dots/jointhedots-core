import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { CharacterLimitPlugin } from '@lexical/react/LexicalCharacterLimitPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { ClearEditorPlugin } from '@lexical/react/LexicalClearEditorPlugin';
import { ClickableLinkPlugin } from '@lexical/react/LexicalClickableLinkPlugin';
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HashtagPlugin } from '@lexical/react/LexicalHashtagPlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { useEffect, useState } from 'react';
import { CAN_USE_DOM } from './shared/canUseDOM';

import { createWebsocketProvider } from './editor/collaboration';
import { ManageSettings, useSettings } from './context/SettingsContext';
import { SharedHistoryContext, useSharedHistoryContext } from './context/SharedHistoryContext';
import AutocompletePlugin from './nodes/Autocomplete/AutocompletePlugin';
import AutoEmbedPlugin from './plugins/AutoEmbedPlugin';
import AutoLinkPlugin from './plugins/AutoLinkPlugin';
import CodeActionMenuPlugin from './plugins/CodeActionMenuPlugin';
import CodeHighlightPlugin from './plugins/CodeHighlightPlugin';
import CollapsiblePlugin from './nodes/Collapsible/CollapsiblePlugin';
import CommentPlugin from './plugins/CommentPlugin';
import ComponentPickerPlugin from './plugins/ComponentPickerPlugin';
import ContextMenuPlugin from './plugins/ContextMenuPlugin';
import DragDropPaste from './plugins/DragDropPastePlugin';
import DraggableBlockPlugin from './plugins/DraggableBlockPlugin';
import EmojiPickerPlugin from './plugins/EmojiPickerPlugin';
import EmojisPlugin from './nodes/Emojis/EmojisPlugin';
import EquationsPlugin from './nodes/Equations/EquationsPlugin';
import ExcalidrawPlugin from './nodes/Excalidraw/ExcalidrawPlugin';
import FigmaPlugin from './nodes/Figma/FigmaPlugin';
import FloatingLinkEditorPlugin from './plugins/FloatingLinkEditorPlugin';
import FloatingTextFormatToolbarPlugin from './plugins/FloatingTextFormatToolbarPlugin';
import ImagesPlugin from './nodes/Images/ImagesPlugin';
import InlineImagePlugin from './nodes/InlineImage/InlineImagePlugin';
import KeywordsPlugin from './nodes/Keywords/KeywordsPlugin';
import { LayoutPlugin } from './nodes/Layout/LayoutPlugin';
import LinkPlugin from './plugins/LinkPlugin';
import ListMaxIndentLevelPlugin from './plugins/ListMaxIndentLevelPlugin';
import { MaxLengthPlugin } from './plugins/MaxLengthPlugin';
import MentionsPlugin from './nodes/Mentions/MentionsPlugin';
import PageBreakPlugin from './nodes/PageBreak/PageBreakPlugin';
import PollPlugin from './nodes/Poll/PollPlugin';
import SpeechToTextPlugin from './plugins/SpeechToTextPlugin';
import TabFocusPlugin from './plugins/TabFocusPlugin';
import TableCellActionMenuPlugin from './plugins/TableActionMenuPlugin';
import TableCellResizer from './plugins/TableCellResizer';
import TableHoverActionsPlugin from './plugins/TableHoverActionsPlugin';
import TableOfContentsPlugin from './plugins/TableOfContentsPlugin';
import ToolbarPlugin from './editor/ToolbarPanel';
import TreeViewPlugin from './editor/TreeViewPanel';
import TwitterPlugin from './nodes/Twitter/TweetPlugin';
import YouTubePlugin from './nodes/YouTube/YouTubePlugin';
import ContentEditable from './ui/ContentEditable';
import { SerializedEditorState } from 'lexical';
import { InitialConfigType, LexicalComposer } from '@lexical/react/LexicalComposer';
import { SAVE_CONTENT_COMMAND } from './editor/commands';
import PlaygroundNodes from './nodes/PlaygroundNodes';
import { FlashMessageContext } from './context/FlashMessageContext';
import { TableContext } from './plugins/TablePlugin';
import { SharedAutocompleteContext } from './context/SharedAutocompleteContext';
import PlaygroundEditorTheme from './themes/PlaygroundEditorTheme';
import { MarkdownViewPlugin } from './editor/MarkdownViewPanel';
import { MARKDOWN_TRANSFORMERS } from './plugins/MarkdownTransformers';
import "./index.css"
import { $updateEditorStateFromMarkdown, transformEditorStateToMarkdown } from 'core/markdown/markdownizer';

function Editor(): JSX.Element {
  const { historyState } = useSharedHistoryContext();
  const { settings, setSettings } = useSettings();
  const isEditable = useLexicalEditable();
  const placeholder = "Write document here..."
  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState<HTMLDivElement | null>(null);
  const [isSmallWidthViewport, setIsSmallWidthViewport] =
    useState<boolean>(false);
  const [isLinkEditMode, setIsLinkEditMode] = useState<boolean>(false);

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

  useEffect(() => {
    const updateViewPortWidth = () => {
      const isNextSmallWidthViewport =
        CAN_USE_DOM && window.matchMedia('(max-width: 1025px)').matches;

      if (isNextSmallWidthViewport !== isSmallWidthViewport) {
        setIsSmallWidthViewport(isNextSmallWidthViewport);
      }
    };
    updateViewPortWidth();
    window.addEventListener('resize', updateViewPortWidth);

    return () => {
      window.removeEventListener('resize', updateViewPortWidth);
    };
  }, [isSmallWidthViewport]);

  return (<div className="livedoc-editor">
    <ToolbarPlugin setIsLinkEditMode={setIsLinkEditMode} />
    <div className="editor-main">
      <div className="editor-container">
        {settings.isMaxLength && <MaxLengthPlugin maxLength={30} />}
        <DragDropPaste />
        <AutoFocusPlugin />
        <ClearEditorPlugin />
        <ComponentPickerPlugin />
        <EmojiPickerPlugin />
        <AutoEmbedPlugin />

        <MentionsPlugin />
        <EmojisPlugin />
        <HashtagPlugin />
        <KeywordsPlugin />
        <SpeechToTextPlugin />
        <AutoLinkPlugin />
        <CommentPlugin providerFactory={settings.isCollab ? createWebsocketProvider : undefined} />
        {settings.isCollab ? (
          <CollaborationPlugin
            id="main"
            providerFactory={createWebsocketProvider}
            shouldBootstrap={true}
          />
        ) : (
          <HistoryPlugin externalHistoryState={historyState} />
        )}
        <RichTextPlugin
          contentEditable={
            <div className="editor-scroller">
              <div className="editor" ref={onRef}>
                <ContentEditable placeholder={placeholder} />
              </div>
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <MarkdownShortcutPlugin transformers={MARKDOWN_TRANSFORMERS} />
        <CodeHighlightPlugin />
        <ListPlugin />
        <CheckListPlugin />
        <ListMaxIndentLevelPlugin maxDepth={7} />
        <TablePlugin
          hasCellMerge={settings.tableCellMerge}
          hasCellBackgroundColor={settings.tableCellBackgroundColor}
        />
        <TableCellResizer />
        <TableHoverActionsPlugin />
        <ImagesPlugin />
        <InlineImagePlugin />
        <LinkPlugin />
        <PollPlugin />
        <TwitterPlugin />
        <YouTubePlugin />
        <FigmaPlugin />
        <ClickableLinkPlugin disabled={isEditable} />
        <HorizontalRulePlugin />
        <EquationsPlugin />
        <ExcalidrawPlugin />
        <TabFocusPlugin />
        <TabIndentationPlugin />
        <CollapsiblePlugin />
        <PageBreakPlugin />
        <LayoutPlugin />
        {floatingAnchorElem && !isSmallWidthViewport && (
          <>
            <DraggableBlockPlugin anchorElem={floatingAnchorElem} />
            <CodeActionMenuPlugin anchorElem={floatingAnchorElem} />
            <FloatingLinkEditorPlugin
              anchorElem={floatingAnchorElem}
              isLinkEditMode={isLinkEditMode}
              setIsLinkEditMode={setIsLinkEditMode}
            />
            <TableCellActionMenuPlugin
              anchorElem={floatingAnchorElem}
              cellMerge={true}
            />
            <FloatingTextFormatToolbarPlugin
              anchorElem={floatingAnchorElem}
              setIsLinkEditMode={setIsLinkEditMode}
            />
          </>
        )}
        {(settings.isCharLimit || settings.isCharLimitUtf8) && (
          <CharacterLimitPlugin
            charset={settings.isCharLimit ? 'UTF-16' : 'UTF-8'}
            maxLength={5}
          />
        )}
        {settings.isAutocomplete && <AutocompletePlugin />}
        <div>{settings.showTableOfContents && <TableOfContentsPlugin />}</div>
        {settings.shouldUseLexicalContextMenu && <ContextMenuPlugin />}
      </div>
      {settings.showSideView === "treeview" && <TreeViewPlugin />}
      {settings.showSideView === "markdown" && <MarkdownViewPlugin />}
    </div>
  </div>)
}

export function DocumentEditor(props: {
  content: SerializedEditorState | string
  onChange: (content: string) => void
}): JSX.Element {

  const { content, onChange } = props

  const initialConfig: InitialConfigType = {
    editorState: (editor) => {
      if (typeof content === "string") {
        editor.update(() => $updateEditorStateFromMarkdown(content))
      }
      else {
        const state = editor.parseEditorState(content)
        editor.setEditorState(state)
      }
      editor.registerCommand(SAVE_CONTENT_COMMAND, (_payload, editor) => {
        const value = transformEditorStateToMarkdown(editor.getEditorState())
        onChange(value)
        return true
      }, 0)
    },
    editable: true,
    namespace: 'Playground',
    nodes: [...PlaygroundNodes],
    onError: (error: Error) => {
      throw error;
    },
    theme: PlaygroundEditorTheme,
  };

  return <ManageSettings id="settings:lexical-editor">
    <FlashMessageContext>
      <LexicalComposer initialConfig={initialConfig}>
        <SharedHistoryContext>
          <TableContext>
            <SharedAutocompleteContext>
              <div className="editor-shell">
                <Editor />
              </div>
            </SharedAutocompleteContext>
          </TableContext>
        </SharedHistoryContext>
      </LexicalComposer>
    </FlashMessageContext>
  </ManageSettings>
}
