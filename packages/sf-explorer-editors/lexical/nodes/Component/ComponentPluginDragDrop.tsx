
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $wrapNodeInElement, CAN_USE_DOM, mergeRegister } from '@lexical/utils';
import {
   $createNodeSelection,
   $createParagraphNode,
   $createRangeSelection,
   $getNodeByKey,
   $getSelection,
   $insertNodes,
   $isNodeSelection,
   $isRootOrShadowRoot,
   $setSelection,
   CLICK_COMMAND,
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
import * as AST from "@sf-explorer/core"
import { useDocumentContext } from '../../context/DocumentContext';
import { LDXElementExpr } from '@sf-explorer/core';
import { EventHandlers, Instrumentation, InstrumentationEndpoints } from '@sf-explorer/core/ui/Instrumentation';

const TRANSPARENT_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const img = document.createElement('img');
img.src = TRANSPARENT_IMAGE;

export const INSERT_COMPONENT_COMMAND: LexicalCommand<AST.Any> =
   createCommand('INSERT_COMPONENT_COMMAND');


export function getDOMSelection(targetWindow: Window | null): Selection | null {
   return CAN_USE_DOM ? (targetWindow || window).getSelection() : null
}

export default function ComponentPluginDragDrop(): JSX.Element | null {
   const [editor] = useLexicalComposerContext();
   const layout = useDocumentContext();

   useEffect(() => {
      if (!editor.hasNodes([ComponentNode])) {
         throw new Error('ImagesPlugin: ImageNode not registered on editor');
      }

      return mergeRegister(
         editor.registerCommand<AST.Any>(
            INSERT_COMPONENT_COMMAND,
            (payload) => {
               const expr = layout.NewFrom(payload)
               if (expr instanceof LDXElementExpr) {
                  const node = new ComponentNode(expr);
                  $insertNodes([node]);
                  if ($isRootOrShadowRoot(node.getParentOrThrow())) {
                     $wrapNodeInElement(node, $createParagraphNode).selectEnd();
                  }
                  return true;
               }
               return false;
            },
            COMMAND_PRIORITY_EDITOR,
         ),
         editor.registerCommand<DragEvent>(
            DRAGSTART_COMMAND,
            (event) => {
               return EventHandlers.onZoneDragStart(event);
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
         editor.registerCommand<MouseEvent>(
            CLICK_COMMAND,
            (event) => {
               return EventHandlers.onZoneSelect(event)
            },
            COMMAND_PRIORITY_LOW,
         ),
         InstrumentationEndpoints.Select.register((payload) => {
            const { zone, controller } = payload
            if (controller instanceof ComponentNode) {
               editor.update(() => {
                  const selection = $createNodeSelection()
                  selection.add(controller.getKey())
                  $setSelection(selection)
                  Instrumentation.select(zone, false)
               });
               return true
            }
            return false
         })
      )
   }, [editor, layout]);

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

InstrumentationEndpoints.Transfer.register((payload) => {
   const { controller, dataTransfer } = payload
   if (controller instanceof ComponentNode) {
      dataTransfer.setDragImage(img, 0, 0)
      dataTransfer.setData(
         'application/x-lexical-drag',
         JSON.stringify({
            ...controller.exportJSON(),
            key: controller.__key,
         }),
      )
   }
})

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
   const dragData = event.dataTransfer?.getData('application/x-lexical-drag');
   if (!dragData) {
      return null;
   }
   const { key, type, descriptor } = JSON.parse(dragData);
   if (type !== 'component') {
      return null;
   }
   event.preventDefault();
   if (canDropComponent(event)) {
      const range = getDragSelection(event);
      const node = $getNodeByKey(key)
      if (node) node.remove();
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
