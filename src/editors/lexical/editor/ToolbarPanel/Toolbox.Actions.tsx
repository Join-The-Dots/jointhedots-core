/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { LexicalEditor } from 'lexical';
import {
  editorStateFromSerializedDocument,
  exportFile,
  importFile,
  SerializedDocument,
  serializedDocumentFromEditorState,
} from '@lexical/file';
import { useCollaborationContext } from '@lexical/react/LexicalCollaborationContext';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import { CONNECTED_COMMAND, TOGGLE_CONNECT_COMMAND } from '@lexical/yjs';
import {
  $getRoot,
  $isParagraphNode,
  CLEAR_EDITOR_COMMAND,
  CLEAR_HISTORY_COMMAND,
  COMMAND_PRIORITY_EDITOR,
} from 'lexical';
import { useEffect, useState } from 'react';

import useFlashMessage from '../../hooks/useFlashMessage';
import useModal from '../../hooks/useModal';
import Button from '../../../ui/Button';
import { docFromHash, docToHash } from '../../utils/docSerialization';
import { SPEECH_TO_TEXT_COMMAND, SUPPORT_SPEECH_RECOGNITION } from '../../plugins/SpeechToTextPlugin';
import DropDown, { DropDownItem } from '@livedoc/editors/lexical/ui/DropDown';
import { useSettings } from '@livedoc/editors/lexical/context/SettingsContext';

async function sendEditorState(editor: LexicalEditor): Promise<void> {
  const stringifiedEditorState = JSON.stringify(editor.getEditorState());
  try {
    await fetch('http://localhost:1235/setEditorState', {
      body: stringifiedEditorState,
      headers: {
        Accept: 'application/json',
        'Content-type': 'application/json',
      },
      method: 'POST',
    });
  } catch {
    // NO-OP
  }
}

async function validateEditorState(editor: LexicalEditor): Promise<void> {
  const stringifiedEditorState = JSON.stringify(editor.getEditorState());
  let response = null;
  try {
    response = await fetch('http://localhost:1235/validateEditorState', {
      body: stringifiedEditorState,
      headers: {
        Accept: 'application/json',
        'Content-type': 'application/json',
      },
      method: 'POST',
    });
  } catch {
    // NO-OP
  }
  if (response !== null && response.status === 403) {
    throw new Error(
      'Editor state validation failed! Server did not accept changes.',
    );
  }
}

async function shareDoc(doc: SerializedDocument): Promise<void> {
  const url = new URL(window.location.toString());
  url.hash = await docToHash(doc);
  const newUrl = url.toString();
  window.history.replaceState({}, '', newUrl);
  await window.navigator.clipboard.writeText(newUrl);
}

export default function ActionsToolbar(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [isEditable, setIsEditable] = useState(() => editor.isEditable());
  const [isSpeechToText, setIsSpeechToText] = useState(false);
  const [connected, setConnected] = useState(false);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [modal, showModal] = useModal();
  const showFlashMessage = useFlashMessage();
  const { isCollabActive } = useCollaborationContext();
  const { settings, setSettings } = useSettings();
  useEffect(() => {
    if (settings.isCollab) {
      return;
    }
    docFromHash(window.location.hash).then((doc) => {
      if (doc && doc.source === 'Playground') {
        editor.setEditorState(editorStateFromSerializedDocument(editor, doc));
        editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
      }
    });
  }, [editor]);
  useEffect(() => {
    return mergeRegister(
      editor.registerEditableListener((editable) => {
        setIsEditable(editable);
      }),
      editor.registerCommand<boolean>(
        CONNECTED_COMMAND,
        (payload) => {
          const isConnected = payload;
          setConnected(isConnected);
          return false;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    );
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(
      ({ dirtyElements, prevEditorState, tags }) => {
        // If we are in read only mode, send the editor state
        // to server and ask for validation if possible.
        if (
          !isEditable &&
          dirtyElements.size > 0 &&
          !tags.has('historic') &&
          !tags.has('collaboration')
        ) {
          validateEditorState(editor);
        }
        editor.getEditorState().read(() => {
          const root = $getRoot();
          const children = root.getChildren();

          if (children.length > 1) {
            setIsEditorEmpty(false);
          } else {
            if ($isParagraphNode(children[0])) {
              const paragraphChildren = children[0].getChildren();
              setIsEditorEmpty(paragraphChildren.length === 0);
            } else {
              setIsEditorEmpty(false);
            }
          }
        });
      },
    );
  }, [editor, isEditable]);

  return (
    <DropDown
      disabled={false}
      buttonClassName="toolbar-item spaced alignment"
      buttonAriaLabel="Actions"
    >

      <DropDownItem
        className="item actions import"
        onClick={() => importFile(editor)}
        aria-label="Import editor state from JSON">
        <i className="icon import" />
        <span className="text">Import</span>
      </DropDownItem>

      <DropDownItem
        className="item actions export"
        onClick={() =>
          exportFile(editor, {
            fileName: `Playground ${new Date().toISOString()}`,
            source: 'Playground',
          })
        }
        aria-label="Export editor state to JSON">
        <i className="icon export" />
        <span className="text">Export</span>
      </DropDownItem>

      <DropDownItem
        className="item"
        onClick={() => {
          setSettings({ showComments: !settings.showComments })
        }}
      >
        <i className="icon comments" />
        <span className="text">Comments</span>
      </DropDownItem>

      {(isCollabActive || settings.isCollab) && <DropDownItem
        className="item actions share"
        onClick={() =>
          shareDoc(
            serializedDocumentFromEditorState(editor.getEditorState(), {
              source: 'Playground',
            }),
          ).then(
            () => showFlashMessage('URL copied to clipboard'),
            () => showFlashMessage('URL could not be copied to clipboard'),
          )
        }
        aria-label="Share Playground link to current editor state">
        <i className="icon share" />
        <span className="text">Share</span>
      </DropDownItem>}

      {isEditorEmpty && <DropDownItem
        className="item actions spaced clear"
        onClick={() => {
          showModal('Clear editor', (onClose) => (
            <ShowClearDialog editor={editor} onClose={onClose} />
          ));
        }}
        aria-label="Clear editor contents">
        <i className="icon clear" />
        <span className="text">Clear</span>
      </DropDownItem>}

      <DropDownItem
        className={`item actions ${!isEditable ? 'unlock' : 'lock'}`}
        onClick={() => {
          // Send latest editor state to commenting validation server
          if (isEditable) {
            sendEditorState(editor);
          }
          editor.setEditable(!editor.isEditable());
        }}
        aria-label={`${!isEditable ? 'Unlock' : 'Lock'} read-only mode`}>
        <i className={!isEditable ? 'icon unlock' : 'icon lock'} />
        <span className="text">Read-Only Mode</span>
      </DropDownItem>

      {settings.showSideView !== "treeview" &&
        <DropDownItem
          className="item actions"
          onClick={() => setSettings({ showSideView: "treeview" })}
        >
          <i className="icon bi bi-diagram-2" />
          <span className="text">Show TreeView</span>
        </DropDownItem>}

      {settings.showSideView !== "markdown" &&
        <DropDownItem
          className="item actions"
          onClick={() => setSettings({ showSideView: "markdown" })}
        >
          <i className="icon markdown" />
          <span className="text">Show Markdown</span>
        </DropDownItem>}

      {settings.showSideView &&
        <DropDownItem
          className="item actions"
          onClick={() => setSettings({ showSideView: null })}
        >
          <i className="icon bi bi-hide" />
          <span className="text">Hide Sidepanel</span>
        </DropDownItem>}


      {SUPPORT_SPEECH_RECOGNITION && (
        <DropDownItem
          onClick={() => {
            editor.dispatchCommand(SPEECH_TO_TEXT_COMMAND, !isSpeechToText);
            setIsSpeechToText(!isSpeechToText);
          }}
          className={'item actions action-button-mic ' + (isSpeechToText ? 'active' : '')}
          aria-label={`${isSpeechToText ? 'Enable' : 'Disable'} speech to text`}
        >
          <i className="icon mic" />
          <span className="text">Speech To Text</span>
        </DropDownItem>
      )}

      {isCollabActive && (
        <DropDownItem
          className="item actions connect"
          onClick={() => {
            editor.dispatchCommand(TOGGLE_CONNECT_COMMAND, !connected);
          }}
          aria-label={`${connected ? 'Disconnect from' : 'Connect to'
            } a collaborative editing server`}>
          <i className={connected ? 'icon disconnect' : 'icon connect'} />
          <span className="text">
            {`${connected ? 'Disconnect' : 'Connect'
              } Collaborative Editing`}
          </span>
        </DropDownItem>
      )}

      {modal}
    </DropDown>
  );
}

function ShowClearDialog({
  editor,
  onClose,
}: {
  editor: LexicalEditor;
  onClose: () => void;
}): JSX.Element {
  return (
    <>
      Are you sure you want to clear the editor?
      <div className="Modal__content">
        <Button
          onClick={() => {
            editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
            editor.focus();
            onClose();
          }}>
          Clear
        </Button>{' '}
        <Button
          onClick={() => {
            editor.focus();
            onClose();
          }}>
          Cancel
        </Button>
      </div>
    </>
  );
}
