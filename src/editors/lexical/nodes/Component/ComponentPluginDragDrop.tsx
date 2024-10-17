
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $wrapNodeInElement, CAN_USE_DOM, mergeRegister } from '@lexical/utils';
import {
   $createParagraphNode,
   $createRangeSelection,
   $getSelection,
   $insertNodes,
   $isNodeSelection,
   $isRootOrShadowRoot,
   $setSelection,
   COMMAND_PRIORITY_EDITOR,
   COMMAND_PRIORITY_HIGH,
   COMMAND_PRIORITY_LOW,
   createCommand,
   DRAGOVER_COMMAND,
   DRAGSTART_COMMAND,
   DROP_COMMAND,
   LexicalCommand,
   LexicalEditor,
} from 'lexical';
import { useEffect } from "react";
import { ComponentNode } from "./ComponentNode";
import { JSXElementData } from "@livedoc/core/ast/evaluate";

const TRANSPARENT_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const img = document.createElement('img');
img.src = TRANSPARENT_IMAGE;

export const INSERT_COMPONENT_COMMAND: LexicalCommand<JSXElementData> =
   createCommand('INSERT_COMPONENT_COMMAND');


export function getDOMSelection(targetWindow: Window | null): Selection | null {
   return CAN_USE_DOM ? (targetWindow || window).getSelection() : null
}

export default function ComponentPluginDragDrop(): JSX.Element | null {
   const [editor] = useLexicalComposerContext();

   useEffect(() => {
      if (!editor.hasNodes([ComponentNode])) {
         throw new Error('ImagesPlugin: ImageNode not registered on editor');
      }

      return mergeRegister(
         editor.registerCommand<JSXElementData>(
            INSERT_COMPONENT_COMMAND,
            (payload) => {
               const imageNode = new ComponentNode(payload);
               $insertNodes([imageNode]);
               if ($isRootOrShadowRoot(imageNode.getParentOrThrow())) {
                  $wrapNodeInElement(imageNode, $createParagraphNode).selectEnd();
               }

               return true;
            },
            COMMAND_PRIORITY_EDITOR,
         ),
         editor.registerCommand<DragEvent>(
            DRAGSTART_COMMAND,
            (event) => {
               return onComponentDragStart(event);
            },
            COMMAND_PRIORITY_HIGH,
         ),
         editor.registerCommand<DragEvent>(
            DRAGOVER_COMMAND,
            (event) => {
               return onComponentDragover(event);
            },
            COMMAND_PRIORITY_LOW,
         ),
         editor.registerCommand<DragEvent>(
            DROP_COMMAND,
            (event) => {
               return onComponentDrop(event, editor);
            },
            COMMAND_PRIORITY_HIGH,
         ),
      )
   }, [editor]);

   return null;
}

function getComponentNodeInSelection(): ComponentNode | null {
   const selection = $getSelection();
   if (!$isNodeSelection(selection)) {
      return null;
   }
   const nodes = selection.getNodes();
   const node = nodes[0];
   return (node instanceof ComponentNode) ? node : null;
}

function canDropComponent(event: DragEvent): boolean {
   const target = event.target;
   return !!(
      target &&
      target instanceof HTMLElement &&
      !target.closest('code, span.editor-image') &&
      target.parentElement &&
      target.parentElement.closest('div.ContentEditable__root')
   );
}

function onComponentDragStart(event: DragEvent): boolean {
   const node = getComponentNodeInSelection();
   if (!node) {
      return false;
   }
   const dataTransfer = event.dataTransfer;
   if (!dataTransfer) {
      return false;
   }
   dataTransfer.setData('text/plain', '_');
   dataTransfer.setDragImage(img, 0, 0);
   dataTransfer.setData(
      'application/x-lexical-drag',
      JSON.stringify(node.exportJSON()),
   );

   return true;
}

function onComponentDragover(event: DragEvent): boolean {
   const node = getComponentNodeInSelection();
   if (!node) {
      return false;
   }
   if (!canDropComponent(event)) {
      event.preventDefault();
   }
   return true;
}

function onComponentDrop(event: DragEvent, editor: LexicalEditor): boolean {
   const node = getComponentNodeInSelection();
   if (!node) {
      return false;
   }
   const dragData = event.dataTransfer?.getData('application/x-lexical-drag');
   if (!dragData) {
      return null;
   }
   const { type, descriptor } = JSON.parse(dragData);
   if (type !== 'image') {
      return null;
   }
   if (!descriptor) {
      return false;
   }
   event.preventDefault();
   if (canDropComponent(event)) {
      const range = getDragSelection(event);
      node.remove();
      const rangeSelection = $createRangeSelection();
      if (range !== null && range !== undefined) {
         rangeSelection.applyDOMRange(range);
      }
      $setSelection(rangeSelection);
      editor.dispatchCommand(INSERT_COMPONENT_COMMAND, descriptor);
   }
   return true;
}

function getDragSelection(event: DragEvent): Range | null | undefined {
   let range;
   const target = event.target as null | Element | Document;
   const targetWindow =
      target == null
         ? null
         : target.nodeType === 9
            ? (target as Document).defaultView
            : (target as Element).ownerDocument.defaultView;
   const domSelection = getDOMSelection(targetWindow);
   if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(event.clientX, event.clientY);
   } else if (event.rangeParent && domSelection !== null) {
      domSelection.collapse(event.rangeParent, event.rangeOffset || 0);
      range = domSelection.getRangeAt(0);
   } else {
      throw Error(`Cannot get the selection when dragging`);
   }

   return range;
}
