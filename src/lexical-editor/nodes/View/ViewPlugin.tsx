import {
  LexicalEditor,
} from 'lexical';


export function InsertExplorerViewDialog({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor;
  onClose: () => void;
}): JSX.Element {

  return (
    <>
      {"TODO"}
    </>
  );
}

export default function ExplorerViewPlugin({
  captionsEnabled,
}: {
  captionsEnabled?: boolean;
}): JSX.Element | null {

  return null;
}
