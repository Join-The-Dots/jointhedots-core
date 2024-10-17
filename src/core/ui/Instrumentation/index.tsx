import * as AST from "../../ast/nodes"
import ReactTools from "@livedoc/core/common/react-tools"
import { DOMSelection } from "./DOMSelection"
import ReactDOMClient from 'react-dom/client'
import EventEmitter from "events"
import dragImageUrl from './drag_icon.svg'
import React from "react"
import "./index.scss"

export type ASTLocation = any

export type DisplayInfos = {
   title: string
   icon?: string
   category?: string
}

export enum InstrumentationKind {
   Zone,
   Tooling,
}

export enum InstrumentationLayout {
   Minimal, // when no editor handle displayed
   Inlaid, // when editor handle are shown inside a packing DOM element
   Placeholder, // when zone is just here to show empty fillable zone
}

export enum ElementBoundingBox {
   Inner, // when bounding box shall fit to the DOM children
   Outer, // when bounding box shall fit to the DOM parent
}

export enum ElementCommand {
   Delete,
   Copy,
   Paste,
}

export interface ElementController {
   readonly layout: InstrumentationLayout
   readonly stretch: ElementBoundingBox
   getDisplayInfos(): DisplayInfos
   getDescriptor(): AST.Any
   setDescriptor(descriptor: AST.Any)
   getLocation(): ASTLocation
   /* getProgram(): Program */
}

export interface ElementTooling {
   getZone(): ElementInstrumentation
}

export interface ElementInstrumentation {
   readonly enabled: boolean
   getBase(): React.Component
   getController(): ElementController
   getDescriptor(): AST.Any
   setDescriptor(descriptor: AST.Any)
   displayTooling(target: ReactDOMClient.Root, hasPreview: boolean)
   updateZone()
}

export interface InstrumentationProvider {
   createInstrumentedView<T extends ElementController>(View: React.ElementType, controller: T): React.ElementType
   updateInstrumentedView<T extends ElementController>(InstrumentedView: React.ElementType, controller: T): React.ElementType
}

export const InstrumentationContext = React.createContext<ElementInstrumentation>(null)

const drag_img = new Image()
drag_img.src = dragImageUrl.toString()

const overlay: HTMLElement = document.createElement("div")
overlay.className = "LDX-Instrumentation-Overlay"
document.body.appendChild(overlay)

const zones: Set<ElementInstrumentation> = new Set()

let compactedDisplay: boolean = true

let selectedZone: DOMSelection = null
let hoveredZone: DOMSelection = null
let timer: any = 0

const InstrumentationEvents = new EventEmitter()

function zoneUpdate() {
   if (selectedZone) {
      requestAnimationFrame(() => {
         selectedZone?.renderOverlay(zoneSelectedRenderer, zoneSelectedParentRenderer)
      })
   }
}
function zoneSelectedRenderer(sel: DOMSelection) {
   sel.element.className = "LDX-Overlay-Selected"
   sel.zone.displayTooling(sel.getRoot(), false)
}
function zoneSelectedParentRenderer(sel: DOMSelection) {
   sel.element.className = "LDX-Overlay-Selected-Parent"
}
function zoneDragOverRenderer(sel: DOMSelection) {
   sel.element.className = "LDX-Overlay-DragOver"
   sel.zone.displayTooling(sel.getRoot(), true)
}
function zoneHoverRenderer(sel: DOMSelection) {
   sel.element.className = "LDX-Overlay-Hover"
   if (selectedZone?.zone !== sel.zone) {
      sel.zone.displayTooling(sel.getRoot(), true)
   }
}

export function registerZone(target: ElementInstrumentation) {
   if (zones.size === 0) {
      timer = setInterval(zoneUpdate, 25)
   }
   zones.add(target)
   InstrumentationEvents.emit("RegisterZone", target)
}

export function unregisterZone(target: ElementInstrumentation) {
   zones.delete(target)
   InstrumentationEvents.emit("UnregisterZone", target)
   if (zones.size === 0) {
      clearInterval(timer)
      timer = 0
   }
}

export function executeZoneCommand(target: ElementInstrumentation, cmd: ElementCommand) {
   console.log("command", cmd, target)
}

export function setInstrumentationMode(_compacted: boolean) {
   compactedDisplay = _compacted
   for (const zone of zones.values()) {
      zone.updateZone()
   }
}

export function isInstrumentationCompacted(): boolean {
   return compactedDisplay
}

export function isSelectedZone(zone: ElementInstrumentation): boolean {
   return selectedZone?.zone === zone
}

export function selectZone(zone: ElementInstrumentation): boolean {
   if (zone) {
      const target = ReactTools.findNodeFromInstance(zone.getBase())
      const newSelected = DOMSelection.computeNodeSelection(target, overlay)
      if (newSelected) {
         newSelected.next = selectedZone
         selectedZone = newSelected
         zone.updateZone()
         unhighligthZone()
         return true
      }
      return false
   }
   else {
      unselectZone()
      return true
   }
}

export function unselectZone() {
   if (selectedZone) {
      for (let sel = selectedZone; sel; sel = sel.next) {
         sel.zone?.updateZone()
      }
      selectedZone.cleanOverlay()
      selectedZone = null
   }
}

export function selectOnController(controller: ElementController): boolean {
   if (selectedZone?.zone?.getController() === controller) {
      return true
   }

   let result = false
   unselectZone()
   for (const zone of zones.values()) {
      if (zone.getController() === controller) {
         result = selectZone(zone) || result
      }
   }
   return result
}

export function selectOnDescriptor(descriptor: any): boolean {
   if (selectedZone?.zone?.getController()?.getDescriptor() === descriptor) {
      return true
   }

   let result = false
   unselectZone()
   for (const zone of zones.values()) {
      if (zone.getController()?.getDescriptor() === descriptor) {
         result = selectZone(zone) || result
      }
   }
   return result
}

export function highligthZone(hovered: DOMSelection, renderer: (sel: DOMSelection) => void) {
   if (!hoveredZone || !hovered || hoveredZone.zone !== hovered.zone) {
      unhighligthZone()
      if (hovered) {
         hoveredZone = hovered
         hoveredZone.renderOverlay(renderer)
      }
   }
   else if (hoveredZone) {
      hoveredZone.isExiting = false
   }
}

export function unhighligthZone() {
   if (hoveredZone) {
      hoveredZone.cleanOverlay()
      hoveredZone = null
   }
}

export const EventHandlers = {
   onZoneKeyDown(e: KeyboardEvent) {
      const zone = selectedZone?.zone
      if (zone) {
         if (e.ctrlKey === true) {
            if (e.key === "c") {
               InstrumentationEvents.emit("CopyZone", zone)
            }
            if (e.key === "v") {
               InstrumentationEvents.emit("PasteZone", zone)
            }
         }
         else {
            if (e.key === "Delete") {
               InstrumentationEvents.emit("DeleteZone", zone)
            }
         }
      }
   },
   onZoneDragStart(e: DragEvent) {
      try {
         const ctl = selectedZone?.zone?.getController()
         if (ctl) {
            const data = {
               action: "displace",
               expression: ctl.getDescriptor(),
               origin: ctl.getLocation(),
            }
            objectToDataTransfert(data, e.dataTransfer)
            e.stopPropagation()
         }
      }
      catch (e) { console.error("onDrag", e) }
   },
   onZoneDragOver(e: DragEvent) {
      const hovered = DOMSelection.computeElementSelection(e.target as HTMLElement, overlay)
      if (hovered) {
         highligthZone(hovered, zoneDragOverRenderer)
         e.preventDefault()
         e.stopPropagation()
      }
      else {
         unhighligthZone()
      }
   },
   onZoneDragLeave(e: DragEvent) {
      const relatedTarget = e.relatedTarget
      if (relatedTarget instanceof HTMLElement) {
         if (relatedTarget?.parentElement === null) {
            unhighligthZone()
         }
      }
   },
   onZoneDrop(e: DragEvent) {
      try {
         const ctl = hoveredZone?.zone?.getController()
         if (ctl) {
            const data = dataTransfertToObject(e.dataTransfer)
            const location = ctl.getLocation()
            if (!location) {
               console.log("drop on empty of", data)
               return
            }
            /* if (data.cmd === TransfertCmd.DescriptorTransfert) {
               const cmd = data as CmdPayload<TransfertApi["DescriptorTransfert"]>
               session.insert(cmd.origin, location, cmd.expression)
            }
            else if (data.cmd === TransfertCmd.ResourceTransfert) {
               const cmd = data as CmdPayload<TransfertApi["ResourceTransfert"]>
               session.insert(location, null, null, { id: cmd.component_id })
            } */
         }
      }
      catch (e) { console.error("onDrop", e) }
   },
   onZoneClick(e: MouseEvent) {
      if (e.ctrlKey) {
         e.stopPropagation()
      }
   },
   onZoneSelect(e: MouseEvent) {
      const target = e.target as HTMLElement
      try {
         const newSelected = DOMSelection.computeElementSelection(target, overlay)
         if (newSelected === undefined) {
            return // avoid to change selection on handle
         }
         if (e.ctrlKey) {
            e.stopPropagation()
         }
         if (newSelected?.zone !== selectedZone?.zone) {
            InstrumentationEvents.emit("SelectZone", newSelected?.zone)
         }
      }
      catch (e) { console.error("onSelect", e) }
   },
   onZoneHover(e: MouseEvent) {
      const hovered = DOMSelection.computeElementSelection(e.target as HTMLElement, overlay)
      if (hovered && hovered.zone !== selectedZone?.zone) {
         highligthZone(hovered, zoneHoverRenderer)
      }
      else {
         unhighligthZone()
      }
   },
   onZoneUnhover() {
      if (hoveredZone?.isExiting) {
         unhighligthZone()
      }
   },
   onZoneExit(e: MouseEvent) {
      if (hoveredZone) {
         hoveredZone.isExiting = true
         setTimeout(EventHandlers.onZoneUnhover, 1)
      }
   },
}

function objectToDataTransfert(data: { [key: string]: any }, dataTransfer: DataTransfer) {
   const content = JSON.stringify(data, null, 2)
   dataTransfer.setData("text/plain", content)
   dataTransfer.setData("application/json", content)
   dataTransfer.setDragImage(drag_img, 0, 0)
}

function dataTransfertToObject(dataTransfer: DataTransfer): any {
   for (const mtype of dataTransfer.types) {
      try {
         return JSON.parse(dataTransfer.getData(mtype))
      }
      catch (e) {
         // Nothing
      }
   }
}

// TO REMOVE: the editor shall register itself
InstrumentationEvents.on("SelectZone", (target: ElementInstrumentation) => {
   selectZone(target)
})
