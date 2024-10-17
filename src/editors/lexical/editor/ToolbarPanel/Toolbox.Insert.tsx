import {
  LexicalEditor,
} from 'lexical';
import DropDown, { DropDownItem } from '../../ui/DropDown';
import {
  INSERT_IMAGE_COMMAND,
  InsertImageDialog,
  InsertImagePayload,
} from '../../nodes/Images/ImagesPlugin';
import { InsertInlineImageDialog } from '../../nodes/InlineImage/InlineImagePlugin';
import { InsertTableDialog } from '../../nodes/Table/TablePlugin';
import { openDialog } from '@livedoc/editors/ui/openDialog';
import { ComponentViewDialog } from '@livedoc/editors/lexical/nodes/Component/ComponentViewDialog'

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
  </DropDown>
}