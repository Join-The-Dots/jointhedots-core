
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $wrapNodeInElement, CAN_USE_DOM, mergeRegister } from '@lexical/utils'
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
   KEY_BACKSPACE_COMMAND,
   KEY_DELETE_COMMAND,
   LexicalCommand,
   LexicalEditor,
   SELECTION_CHANGE_COMMAND,
} from 'lexical'
import { useCallback, useEffect } from "react"
import { ComponentNode } from "./ComponentNode"
import { useDocumentContext } from '../../context/DocumentContext'
import { createLDXKey, ElementJSON, LDXDocumentExpr, serializeElement } from '@jointhedots/core'
import { EventHandlers, Instrumentation, InstrumentationEndpoints, InstrumentationEvents } from '@jointhedots/ui/Instrumentation'
import { useFeature } from '@jointhedots/editors/ui/FeaturesLayout'
import { ViewEditor } from '@jointhedots/editors/designer/editor'
import { ElementEditionSelection } from '@jointhedots/editors/designer/EditionSession'

const TRANSPARENT_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
const img = document.createElement('img')
img.src = TRANSPARENT_IMAGE

export const INSERT_COMPONENT_COMMAND: LexicalCommand<ElementJSON> =
   createCommand('INSERT_COMPONENT_COMMAND')


export function getDOMSelection(targetWindow: Window | null): Selection | null {
   return CAN_USE_DOM ? (targetWindow || window).getSelection() : null
}

export async function insertComponentInto(editor: LexicalEditor, layout: LDXDocumentExpr, payload: ElementJSON) {
   const key = createLDXKey()
   const data = serializeElement(layout)
   data.embeds.inner[key] = payload
   await layout.update(data)
   editor.update(() => {
      const node = new ComponentNode(layout, key)
      $insertNodes([node])
      if ($isRootOrShadowRoot(node.getParentOrThrow())) {
         $wrapNodeInElement(node, $createParagraphNode).selectEnd()
      }
   })
}

export default function ComponentPluginDragDrop(): JSX.Element | null {
   const [editor] = useLexicalComposerContext()
   const layout = useDocumentContext()
   const viewEditor = useFeature(ViewEditor)

   const $onDelete = useCallback(
      (payload: KeyboardEvent) => {
         const deleteSelection = $getSelection()
         if (Instrumentation.focused && $isNodeSelection(deleteSelection)) {
            const event: KeyboardEvent = payload
            event.preventDefault()
            editor.update(() => {
               deleteSelection.getNodes().forEach((node) => {
                  if (node instanceof ComponentNode) {
                     node.remove()
                     Instrumentation.unselect()
                  }
               })
            })
         }
         else {
            editor.update(() => {
               deleteSelection.getNodes().forEach((node) => {
                  if (node instanceof ComponentNode) {
                     const selection = $createNodeSelection()
                     selection.add(node.getKey())
                     $setSelection(selection)
                     const zone = Instrumentation.findZone(node)
                     Instrumentation.focus(zone)
                  }
               })
            })
         }
         return false
      },
      [editor],
   )

   useEffect(() => {
      if (!editor.hasNodes([ComponentNode])) {
         throw new Error('ImagesPlugin: ImageNode not registered on editor')
      }

      return mergeRegister(
         editor.registerCommand<ElementJSON>(
            INSERT_COMPONENT_COMMAND,
            (payload) => {
               insertComponentInto(editor, layout, payload)
               return true
            },
            COMMAND_PRIORITY_EDITOR,
         ),
         editor.registerCommand<DragEvent>(
            DRAGSTART_COMMAND,
            (event) => {
               return EventHandlers.onZoneDragStart(event)
            },
            COMMAND_PRIORITY_HIGH,
         ),
         editor.registerCommand<DragEvent>(
            DRAGOVER_COMMAND,
            (event) => {
               return onComponentDragover(event)
            },
            COMMAND_PRIORITY_LOW,
         ),
         editor.registerCommand<DragEvent>(
            DROP_COMMAND,
            (event) => {
               return onComponentDrop(event, editor)
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
         editor.registerCommand(
            KEY_DELETE_COMMAND,
            $onDelete,
            COMMAND_PRIORITY_LOW,
         ),
         editor.registerCommand(
            KEY_BACKSPACE_COMMAND,
            $onDelete,
            COMMAND_PRIORITY_LOW,
         ),
         editor.registerCommand(
            SELECTION_CHANGE_COMMAND,
            (_, editor) => {
               Instrumentation.focus(null)
               return false
            },
            COMMAND_PRIORITY_LOW,
         ),
         InstrumentationEndpoints.Select.register((payload) => {
            const { zone } = payload
            Instrumentation.select(zone, false)
            viewEditor.select(new ElementEditionSelection(zone.getElement(), viewEditor.session), true)
            return true
         }),
         InstrumentationEvents.onSelect.register((state) => {
            if (state.selections.size > 0) {
               for (const element of state.selections) {
                  const zone = state.instrumenteds.get(element)?.[0]
                  const controller = zone?.getController()
                  if (controller instanceof ComponentNode) {
                     viewEditor.select(new ElementEditionSelection(zone.getElement(), viewEditor.session), true)
                  }
               }
            }
            else {
               viewEditor.unselect()
            }
         }),
         InstrumentationEvents.onFocus.register((state) => {
            const controller = state.focused?.getController()
            if (controller instanceof ComponentNode) {
               editor.update(() => {
                  const selection = $createNodeSelection()
                  selection.add(controller.getKey())
                  $setSelection(selection)
                  viewEditor.select(new ElementEditionSelection(controller.getElement(), viewEditor.session), true)
               })
               return true
            }
            return false
         }),
      )
   }, [editor, layout, $onDelete, viewEditor])

   return null
}

function getComponentNodeInSelection(): ComponentNode | null {
   const selection = $getSelection()
   if (!$isNodeSelection(selection)) {
      return null
   }
   const nodes = selection.getNodes()
   const node = nodes[0]
   return (node instanceof ComponentNode) ? node : null
}

function canDropComponent(event: DragEvent): boolean {
   const target = event.target
   return !!(
      target &&
      target instanceof HTMLElement &&
      !target.closest('code, span.editor-image') &&
      target.parentElement &&
      target.parentElement.closest('div.ContentEditable__root')
   )
}

InstrumentationEndpoints.Transfer.register((payload) => {
   const { controller, dataTransfer } = payload
   if (controller instanceof ComponentNode) {
      const data = controller.exportJSON()
      dataTransfer.setDragImage(img, 0, 0)
      dataTransfer.setData(
         'application/x-lexical-drag',
         JSON.stringify({
            ...data,
            key: controller.__key,
         }),
      )
   }
})

function onComponentDragover(event: DragEvent): boolean {
   const node = getComponentNodeInSelection()
   if (!node) {
      return false
   }
   if (!canDropComponent(event)) {
      event.preventDefault()
   }
   return true
}

function onComponentDrop(event: DragEvent, editor: LexicalEditor): boolean {
   const dragData = event.dataTransfer?.getData('application/x-lexical-drag')
   if (!dragData) {
      return null
   }
   const { key, type, descriptor } = JSON.parse(dragData)
   if (type !== 'component') {
      return null
   }
   event.preventDefault()
   if (canDropComponent(event)) {
      const range = getDragSelection(event)
      const node = $getNodeByKey(key)
      if (node) node.remove()
      const rangeSelection = $createRangeSelection()
      if (range !== null && range !== undefined) {
         rangeSelection.applyDOMRange(range)
      }
      $setSelection(rangeSelection)
      editor.dispatchCommand(INSERT_COMPONENT_COMMAND, descriptor)
   }
   return true
}

function getDragSelection(event: DragEvent): Range | null | undefined {
   let range
   const target = event.target as null | Element | Document
   const targetWindow =
      target == null
         ? null
         : target.nodeType === 9
            ? (target as Document).defaultView
            : (target as Element).ownerDocument.defaultView
   const domSelection = getDOMSelection(targetWindow)
   if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(event.clientX, event.clientY)
   } else if (event.rangeParent && domSelection !== null) {
      domSelection.collapse(event.rangeParent, event.rangeOffset || 0)
      range = domSelection.getRangeAt(0)
   } else {
      throw Error(`Cannot get the selection when dragging`)
   }

   return range
}
