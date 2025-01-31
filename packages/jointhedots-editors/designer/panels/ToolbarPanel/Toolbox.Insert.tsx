import { LexicalEditor } from 'lexical';
import DropDown, { DropDownItem } from '../../ui/DropDown';
import { InsertImageDialog } from '../../nodes/Images/ImagesPlugin';
import { InsertInlineImageDialog } from '../../nodes/InlineImage/InlineImagePlugin';
import { InsertTableDialog } from '../../nodes/Table/TablePlugin';
import { openDialog } from '@jointhedots/editors/ui/openDialog';
import { ComponentViewDialog } from '@jointhedots/editors/designer/nodes/Component/ComponentViewDialog'
import { useDocumentContext } from '../../context/DocumentContext';

export function InsertToolbox(props: { activeEditor: LexicalEditor, editor: LexicalEditor, isEditable: boolean, showModal: any }) {
  const { activeEditor, isEditable, showModal } = props
  const layout = useDocumentContext()
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
            layout={layout}
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