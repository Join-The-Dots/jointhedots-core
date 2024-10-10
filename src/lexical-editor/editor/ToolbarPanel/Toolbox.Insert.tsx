import { INSERT_EMBED_COMMAND } from '@lexical/react/LexicalAutoEmbedPlugin';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import {
  $getRoot,
  LexicalEditor,
} from 'lexical';
import catTypingGif from '../../images/cat-typing.gif';
import { $createStickyNode } from '../../nodes/Sticky/StickyNode';
import DropDown, { DropDownItem } from '../../ui/DropDown';
import { EmbedConfigs } from '../../plugins/AutoEmbedPlugin';
import { INSERT_COLLAPSIBLE_COMMAND } from '../../nodes/Collapsible/CollapsiblePlugin';
import { InsertEquationDialog } from '../../nodes/Equations/EquationsPlugin';
import { INSERT_EXCALIDRAW_COMMAND } from '../../nodes/Excalidraw/ExcalidrawPlugin';
import {
  INSERT_IMAGE_COMMAND,
  InsertImageDialog,
  InsertImagePayload,
} from '../../nodes/Images/ImagesPlugin';
import { InsertInlineImageDialog } from '../../nodes/InlineImage/InlineImagePlugin';
import InsertLayoutDialog from '../../nodes/Layout/InsertLayoutDialog';
import { INSERT_PAGE_BREAK } from '../../nodes/PageBreak/PageBreakPlugin';
import { InsertPollDialog } from '../../nodes/Poll/PollPlugin';
import { InsertTableDialog } from '../../plugins/TablePlugin';
import { openDialog } from 'components/openDialog';
import { ComponentViewDialog } from 'lexical-editor/nodes/Component/ComponentPlugin'

export function InsertToolbox(props: { activeEditor: LexicalEditor, editor: LexicalEditor, isEditable: boolean, showModal: any }) {
  const { activeEditor, editor, isEditable, showModal } = props
  const insertGifOnClick = (payload: InsertImagePayload) => {
    activeEditor.dispatchCommand(INSERT_IMAGE_COMMAND, payload);
  };
  return <DropDown
    disabled={!isEditable}
    buttonClassName="toolbar-item spaced"
    buttonLabel="Insert"
    buttonAriaLabel="Insert specialized editor node"
    buttonIconClassName="icon plus">
    <DropDownItem
      onClick={() => {
        openDialog<void>((onClose) => {
          return <ComponentViewDialog
            activeEditor={activeEditor}
            onClose={onClose}
          />
        });
      }}
      className="item">
      <i className="icon plus" />
      <span className="text">View...</span>
    </DropDownItem>
    <DropDownItem
      onClick={() => {
        activeEditor.dispatchCommand(
          INSERT_HORIZONTAL_RULE_COMMAND,
          undefined,
        );
      }}
      className="item">
      <i className="icon horizontal-rule" />
      <span className="text">Horizontal Rule</span>
    </DropDownItem>
    <DropDownItem
      onClick={() => {
        activeEditor.dispatchCommand(INSERT_PAGE_BREAK, undefined);
      }}
      className="item">
      <i className="icon page-break" />
      <span className="text">Page Break</span>
    </DropDownItem>
    <DropDownItem
      onClick={() => {
        showModal('Insert Image', (onClose) => (
          <InsertImageDialog
            activeEditor={activeEditor}
            onClose={onClose}
          />
        ));
      }}
      className="item">
      <i className="icon image" />
      <span className="text">Image</span>
    </DropDownItem>
    <DropDownItem
      onClick={() => {
        showModal('Insert Inline Image', (onClose) => (
          <InsertInlineImageDialog
            activeEditor={activeEditor}
            onClose={onClose}
          />
        ));
      }}
      className="item">
      <i className="icon image" />
      <span className="text">Inline Image</span>
    </DropDownItem>
    <DropDownItem
      onClick={() =>
        insertGifOnClick({
          altText: 'Cat typing on a laptop',
          src: catTypingGif,
        })
      }
      className="item">
      <i className="icon gif" />
      <span className="text">GIF</span>
    </DropDownItem>
    <DropDownItem
      onClick={() => {
        activeEditor.dispatchCommand(
          INSERT_EXCALIDRAW_COMMAND,
          undefined,
        );
      }}
      className="item">
      <i className="icon diagram-2" />
      <span className="text">Excalidraw</span>
    </DropDownItem>
    <DropDownItem
      onClick={() => {
        showModal('Insert Table', (onClose) => (
          <InsertTableDialog
            activeEditor={activeEditor}
            onClose={onClose}
          />
        ));
      }}
      className="item">
      <i className="icon table" />
      <span className="text">Table</span>
    </DropDownItem>
    <DropDownItem
      onClick={() => {
        showModal('Insert Poll', (onClose) => (
          <InsertPollDialog
            activeEditor={activeEditor}
            onClose={onClose}
          />
        ));
      }}
      className="item">
      <i className="icon poll" />
      <span className="text">Poll</span>
    </DropDownItem>
    <DropDownItem
      onClick={() => {
        showModal('Insert Columns Layout', (onClose) => (
          <InsertLayoutDialog
            activeEditor={activeEditor}
            onClose={onClose}
          />
        ));
      }}
      className="item">
      <i className="icon columns" />
      <span className="text">Columns Layout</span>
    </DropDownItem>

    <DropDownItem
      onClick={() => {
        showModal('Insert Equation', (onClose) => (
          <InsertEquationDialog
            activeEditor={activeEditor}
            onClose={onClose}
          />
        ));
      }}
      className="item">
      <i className="icon equation" />
      <span className="text">Equation</span>
    </DropDownItem>
    <DropDownItem
      onClick={() => {
        editor.update(() => {
          const root = $getRoot();
          const stickyNode = $createStickyNode(0, 0);
          root.append(stickyNode);
        });
      }}
      className="item">
      <i className="icon sticky" />
      <span className="text">Sticky Note</span>
    </DropDownItem>
    <DropDownItem
      onClick={() => {
        editor.dispatchCommand(
          INSERT_COLLAPSIBLE_COMMAND,
          undefined,
        );
      }}
      className="item">
      <i className="icon caret-right" />
      <span className="text">Collapsible container</span>
    </DropDownItem>
    {EmbedConfigs.map((embedConfig) => (
      <DropDownItem
        key={embedConfig.type}
        onClick={() => {
          activeEditor.dispatchCommand(
            INSERT_EMBED_COMMAND,
            embedConfig.type,
          );
        }}
        className="item">
        {embedConfig.icon}
        <span className="text">{embedConfig.contentName}</span>
      </DropDownItem>
    ))}
  </DropDown>
}