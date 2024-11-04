import { findIntrumentationFromDOM, ZoneSelection } from "./selection"
import ReactDOMClient from 'react-dom/client'
import EventEmitter from "events"
import dragImageUrl from './drag_icon.svg'
import React, { useContext } from "react"
import "./index.scss"
import { Expr } from "../../interpreter/exprs"
import { HandlersManifold } from "../../common/handlers"

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
   getElement(): Expr
   getLocation(): ASTLocation
   /* getProgram(): Program */
}

export interface ElementTooling {
   getZone(): ElementInstrumentation
}

export interface ElementInstrumentation {
   readonly enabled: boolean
   selection: ZoneSelection
   getBase(): React.Component
   getController(): ElementController
   getElement(): Expr
   displayTooling(target: ReactDOMClient.Root, hasPreview: boolean)
   updateZone()
}

export interface InstrumentationProvider {
   createInstrumentedView<T extends ElementController>(View: React.ElementType, controller: T): React.ElementType
   updateInstrumentedView<T extends ElementController>(InstrumentedView: React.ElementType, controller: T): React.ElementType
}

export const InstrumentationContext = React.createContext<ElementInstrumentation>(null)

export function useInstrumentation(): ElementInstrumentation {
   return useContext(InstrumentationContext)
}

export class InstrumentationState {
   instrumenteds = new Map<Expr, ElementInstrumentation[]>()
   selections = new Set<Expr>()
   focused: ElementInstrumentation = null
   hovered: ZoneSelection = null
   overlay: HTMLElement = null

   constructor() {
      this.overlay = document.createElement("div")
      this.overlay.className = "LDX-Instrumentation-Overlay"
      document.body.appendChild(this.overlay)
   }
   update() {
      for (const target of this.selections) {
         if (this.instrumenteds.has(target)) {
            for (const zone of this.instrumenteds.get(target)) {
               zone.selection?.updateOverlay()
            }
         }
      }
      this.hovered = this.hovered?.updateOverlay()
   }
   select(target: ElementInstrumentation | Expr, multiple: boolean, focused?: ElementInstrumentation) {
      if (target instanceof Expr) {
         if (!this.selections.has(target)) {
            if (!multiple) this.unselect()
            this.selections.add(target)
            if (this.instrumenteds.has(target)) {
               for (const zone of this.instrumenteds.get(target)) {
                  const selection = ZoneSelection.computeZoneSelection(zone, this.overlay)
                  selection.setRenderer(zoneSelectedRenderer, zoneSelectedParentRenderer)
                  zone.selection = selection
                  zone.updateZone()
               }
            }
            this.focused = focused
            this.unhighligth()
         }
      }
      else if (target) {
         this.select(target.getElement(), multiple, target)
      }
      else {
         this.unselect()
      }
   }
   unselect(target?: Expr) {
      if (target instanceof Expr) {
         this.selections.delete(target)
         if (this.focused?.getElement() === target) {
            this.focused = null
         }
      }
      else {
         for (const target of this.selections) {
            if (this.instrumenteds.has(target)) {
               for (const zone of this.instrumenteds.get(target)) {
                  zone.selection?.cleanOverlay()
                  zone.selection = null
               }
            }
         }
         this.selections.clear()
         this.focused = null
      }
   }
   highligth(hovered: ZoneSelection, renderer: (sel: ZoneSelection) => void) {
      if (!this.hovered || !hovered || this.hovered.zone !== hovered.zone) {
         this.unhighligth()
         if (hovered) {
            this.hovered = hovered
            this.hovered.setRenderer(renderer)
            this.hovered = this.hovered.updateOverlay()
         }
      }
      else if (this.hovered) {
         this.hovered.isExiting = false
      }
   }
   unhighligth() {
      if (this.hovered) {
         this.hovered.cleanOverlay()
         this.hovered = null
      }
   }
   registerElement(element: Expr): ElementInstrumentation[] {
      const { instrumenteds } = Instrumentation
      let zones = instrumenteds.get(element)
      if (!zones) instrumenteds.set(element, zones = [])
      return zones
   }
   unregisterElement(element: Expr) {
      const { instrumenteds, selections } = Instrumentation
      if (selections.has(element)) this.unselect(element)
      instrumenteds.delete(element)
   }
   registerZone(zone: ElementInstrumentation) {
      const { selections } = Instrumentation
      const element = zone.getElement()
      this.registerElement(element).push(zone)

      if (selections.has(element)) {
         const selection = ZoneSelection.computeZoneSelection(zone, Instrumentation.overlay)
         selection.setRenderer(zoneSelectedRenderer, zoneSelectedParentRenderer)
         zone.selection = selection
         zone.updateZone()
      }

      if (timer === 0) zoneRunRefresh()
   }
   unregisterZone(zone: ElementInstrumentation) {
      const { instrumenteds } = Instrumentation
      const element = zone.getElement()

      if (zone.selection) {
         const { selection } = zone
         zone.selection = null
         setTimeout(() => selection.cleanOverlay(), 0)
      }

      let zones = instrumenteds.get(element)
      let index = zones ? zones.indexOf(zone) : -1
      if (index >= 0) {
         zones.splice(index, 1)
         if (zones.length === 0) {
            Instrumentation.unregisterElement(element)
         }
      }
   }

}

export const Instrumentation = new InstrumentationState()

export const InstrumentationEndpoints = {
   "Transfer": new HandlersManifold<{
      zone: ElementInstrumentation
      controller: ElementController
      dataTransfer: DataTransfer
   }>(),
   "Drop": new HandlersManifold<{
      zone: ElementInstrumentation
      controller: ElementController
      dataTransfer: DataTransfer
      event: DragEvent
   }>(),
   "Command": new HandlersManifold<{
      cmd: ElementCommand
      target: Expr
   }>(),
   "Select": new HandlersManifold<{
      zone: ElementInstrumentation
      controller: ElementController
   }>(),
}

let timer: any = 0
let compactedDisplay: boolean = true
const drag_img = new Image()
drag_img.src = dragImageUrl.toString()

function zoneRunRefresh() {
   timer = setInterval(() => {
      if (Instrumentation.selections.size > 0 || Instrumentation.hovered) {
         requestAnimationFrame(() => Instrumentation.update())
      }
   }, 25)
}
function zoneSelectedRenderer(sel: ZoneSelection) {
   sel.element.className = "LDX-Overlay-Selected"
   sel.zone.displayTooling(sel.getRoot(), false)
}
function zoneSelectedParentRenderer(sel: ZoneSelection) {
   sel.element.className = "LDX-Overlay-Selected-Parent"
}
function zoneDragOverRenderer(sel: ZoneSelection) {
   sel.element.className = "LDX-Overlay-DragOver"
   sel.zone.displayTooling(sel.getRoot(), true)
}
function zoneHoverRenderer(sel: ZoneSelection) {
   sel.element.className = "LDX-Overlay-Hover"
   if (Instrumentation.focused !== sel.zone) {
      //sel.zone.displayTooling(sel.getRoot(), true)
   }
}

export function executeZoneCommand(target: ElementInstrumentation, cmd: ElementCommand) {
   console.log("command", cmd, target)
}

export function setInstrumentationMode(_compacted: boolean) {
   const { instrumenteds } = Instrumentation
   compactedDisplay = _compacted
   for (const zones of instrumenteds.values()) {
      for (const zone of zones) {
         zone.updateZone()
      }
   }
}

export function isInstrumentationCompacted(): boolean {
   return compactedDisplay
}

export const EventHandlers = {
   onZoneKeyDown(e: KeyboardEvent) {
      const { instrumenteds } = Instrumentation
      for (const target of instrumenteds.keys()) {
         if (e.ctrlKey === true) {
            if (e.key === "c") {
               InstrumentationEndpoints.Command.apply({
                  cmd: ElementCommand.Copy,
                  target,
               })
            }
            if (e.key === "v") {
               InstrumentationEndpoints.Command.apply({
                  cmd: ElementCommand.Paste,
                  target,
               })
            }
         }
         else {
            if (e.key === "Delete") {
               InstrumentationEndpoints.Command.apply({
                  cmd: ElementCommand.Delete,
                  target,
               })
            }
         }
      }
   },
   onZoneDragStart(e: DragEvent): boolean {
      try {
         const { selections, instrumenteds } = Instrumentation
         if (selections.size === 1) {
            for (const target of selections) {
               const zones = instrumenteds.get(target)
               if (zones && zones.length > 0) {
                  InstrumentationEndpoints.Transfer.apply({
                     zone: zones[0],
                     controller: zones[0].getController(),
                     dataTransfer: e.dataTransfer,
                  })
                  e.stopPropagation()
                  return true
               }
            }
         }
         else if (selections.size > 1) {
            e.preventDefault()
            e.stopPropagation()
            return true
         }
      }
      catch (e) { console.error("onDrag", e) }
      return false
   },
   onZoneDragOver(e: DragEvent) {
      const hovered = ZoneSelection.computeElementSelection(e.target as HTMLElement, Instrumentation.overlay)
      if (hovered) {
         Instrumentation.highligth(hovered, zoneDragOverRenderer)
         e.preventDefault()
         e.stopPropagation()
      }
      else {
         Instrumentation.unhighligth()
      }
   },
   onZoneDragLeave(e: DragEvent) {
      const relatedTarget = e.relatedTarget
      if (relatedTarget instanceof HTMLElement) {
         if (relatedTarget?.parentElement === null) {
            Instrumentation.unhighligth()
         }
      }
   },
   onZoneDrop(e: DragEvent): boolean {
      try {
         return InstrumentationEndpoints.Drop.apply({
            zone: Instrumentation.hovered?.zone,
            controller: Instrumentation.hovered?.zone?.getController(),
            dataTransfer: e.dataTransfer,
            event: e,
         })
      }
      catch (e) { console.error("onDrop", e) }
      return false
   },
   onZoneClick(e: MouseEvent) {
      if (e.ctrlKey) {
         e.stopPropagation()
      }
   },
   onZoneSelect(e: MouseEvent): boolean {
      const target = e.target as HTMLElement
      try {
         const zone = findIntrumentationFromDOM(target)
         if (zone) {
            if (e.ctrlKey) {
               e.stopPropagation()
            }
            if (InstrumentationEndpoints.Select.apply({
               controller: zone.getController(),
               zone,
            })) {
               return true
            }
         }
      }
      catch (e) { console.error("onSelect", e) }
      Instrumentation.unselect()
      return false
   },
   onZoneHover(e: MouseEvent) {
      const hovered = ZoneSelection.computeElementSelection(e.target as HTMLElement, Instrumentation.overlay)
      if (hovered && !hovered.zone.selection) {
         Instrumentation.highligth(hovered, zoneHoverRenderer)
      }
      else {
         Instrumentation.unhighligth()
      }
   },
   onZoneUnhover() {
      if (Instrumentation.hovered?.isExiting) {
         Instrumentation.unhighligth()
      }
   },
   onZoneExit(e: MouseEvent) {
      if (Instrumentation.hovered) {
         Instrumentation.hovered.isExiting = true
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

InstrumentationEndpoints.Transfer.register((payload) => {
   const { controller } = payload
   const xpr = controller.getElement()
   const data = {
      action: "displace",
      doc: xpr.model.id,
      expr: xpr.$key,
      origin: controller.getLocation(),
   }
   objectToDataTransfert(data, payload.dataTransfer)
})
