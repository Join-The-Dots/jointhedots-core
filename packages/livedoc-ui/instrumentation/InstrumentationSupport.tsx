import React from "react"
import ReactDOM from "react-dom"
import ReactDOMClient from 'react-dom/client'
import { ReactFiberNode, ReactTools } from "@livedoc/core/react/react-tools"
import { InstrumentationHandle, InstrumentationToolBox } from "./InstrumentationHandle"
import { InstrumentationZone } from "./InstrumentationZone"
import dragImageUrl from './drag_icon.svg'
import { InstrumentationController, InstrumentationBoundingBox } from "packages/livedoc-ui/instrumentation"
import { DocumentModel, DXElement } from "@livedoc/core/interpreter/model"
import { AST } from "@livedoc/core"

export enum ZoneAction {
   Delete,
   Copy,
   Paste,
}

type PropsType = {
   editedModel: DocumentModel
   onSelect?: (target: InstrumentationZone, event: MouseEvent) => void
   onChange?: (target: InstrumentationZone, data: any) => any
   onDrag?: (target: InstrumentationZone, event: DragEvent) => any
   onDrop?: (target: InstrumentationZone, data: any, event: DragEvent) => void
   onRegisterZone?: (target: InstrumentationZone) => void
   onUnregisterZone?: (target: InstrumentationZone) => void
   onAction?: (action: ZoneAction, zone: InstrumentationZone) => void
   children?: any
}

export interface IInstrumentationSupport {
   readonly compacted: boolean
   readonly zones: Set<InstrumentationZone>
   setDisplay(compacted: boolean)
   selectZone(zone: InstrumentationZone): boolean
   selectOnKey(key: string): boolean
   selectOnController(controller: InstrumentationController): boolean
   unselectZone()
   unhighligthZone()
}

export interface IInstrumentationElement {
   getController(): InstrumentationController
   getZone(): InstrumentationZone
   getElement(): DXElement
}

export const ReactInstrumentationContext = React.createContext<InstrumentationSupport>(null)

export class InstrumentationSupport extends React.Component<PropsType> implements IInstrumentationSupport {
   selected: DOMSelection = null
   hovered: DOMSelection = null
   timer: any = 0
   compacted: boolean = false

   support: HTMLElement = null
   overlay: HTMLElement = null

   zones: Set<InstrumentationZone> = new Set()

   setDisplay(compacted: boolean) {
      this.compacted = compacted
      for (const zone of this.zones.values()) {
         zone.updateZone()
      }
   }
   isInstrumentedModel(model: DocumentModel) {
      return this.props.editedModel === model
   }
   isSelectedZone(zone: InstrumentationZone): boolean {
      return this.selected?.zone === zone
   }
   selectZone(zone: InstrumentationZone): boolean {
      const target = ReactTools.findNodeFromInstance(zone)
      const newSelected = DOMSelection.computeNodeSelection(target, this.overlay)
      if (newSelected) {
         newSelected.next = this.selected
         this.selected = newSelected
         zone.updateZone()
         this.unhighligthZone()
         return true
      }
      return false
   }
   selectOnController(controller: InstrumentationController): boolean {
      if (this.selected?.zone?.getController() === controller) {
         return true
      }

      let result = false
      this.unselectZone()
      for (const zone of this.zones.values()) {
         if (zone.getController() === controller) {
            result = this.selectZone(zone) || result
         }
      }
      return result
   }
   selectOnKey(key: string): boolean {
      if (this.selected?.zone?.getElement()?.$key === key) {
         return true
      }

      let result = false
      this.unselectZone()
      for (const zone of this.zones.values()) {
         if (zone.getController()?.getElement()?.$key === key) {
            result = this.selectZone(zone) || result
         }
      }
      return result
   }
   changeZone(target: InstrumentationZone, descriptor: AST.Any) {
      return this.props?.onChange?.(target, descriptor)
   }
   highligthZone(hovered: DOMSelection, renderer: (sel: DOMSelection) => void) {
      if (!this.hovered || !hovered || this.hovered.zone !== hovered.zone) {
         this.unhighligthZone()
         if (hovered) {
            this.hovered = hovered
            this.hovered.renderOverlay(renderer)
         }
      }
      else if (this.hovered) {
         this.hovered.isExiting = false
      }
   }
   unhighligthZone() {
      if (this.hovered) {
         this.hovered.cleanOverlay()
         this.hovered = null
      }
   }
   unselectZone() {
      if (this.selected) {
         for (let sel = this.selected; sel; sel = sel.next) {
            sel.zone?.updateZone()
         }
         this.selected.cleanOverlay()
         this.selected = null
      }
   }
   componentDidMount() {
      const { support } = this
      support.tabIndex = -1
      support.draggable = true
      support.addEventListener("keydown", this.onZoneKeyDown, true)
      support.addEventListener("mousedown", this.onZoneSelect, true)
      support.addEventListener("mousemove", this.onZoneHover, true)
      support.addEventListener("mouseleave", this.onZoneExit, true)
      support.addEventListener("mouseup", this.onZoneClick, true)
      support.addEventListener("click", this.onZoneClick, true)
      support.addEventListener("dragstart", this.onZoneDragStart, true)
      support.addEventListener("dragover", this.onZoneDragOver, true)
      support.addEventListener("dragleave", this.onZoneDragLeave, true)
      support.addEventListener("drop", this.onZoneDrop, true)
      support.addEventListener("contextmenu", this.onContextMenu, true)
      this.timer = setInterval(this.zoneUpdate, 100)
   }
   componentWillUnmount() {
      const { support } = this
      support.removeEventListener("keydown", this.onZoneKeyDown, true)
      support.removeEventListener("mousedown", this.onZoneSelect, true)
      support.removeEventListener("mousemove", this.onZoneHover, true)
      support.removeEventListener("mouseleave", this.onZoneExit, true)
      support.removeEventListener("mouseup", this.onZoneClick, true)
      support.removeEventListener("click", this.onZoneClick, true)
      support.removeEventListener("dragstart", this.onZoneDragStart, true)
      support.removeEventListener("dragover", this.onZoneDragOver, true)
      support.removeEventListener("dragleave", this.onZoneDragLeave, true)
      support.removeEventListener("drop", this.onZoneDrop, true)
      support.removeEventListener("contextmenu", this.onContextMenu, true)
      clearInterval(this.timer)
   }

   private zoneSelectedRenderer = (sel: DOMSelection) => {
      sel.element.className = "InSlick-Overlay-Selected"
      if (!sel.zone.handle) {
         if (this.compacted) {
            sel.getRoot().render(<InstrumentationToolBox sticked instrumentation={sel.zone} />)
         }
         else {
            sel.getRoot().render(<InstrumentationHandle sticked instrumentation={sel.zone} />)
         }
      }
   }
   private zoneSelectedParentRenderer = (sel: DOMSelection) => {
      sel.element.className = "InSlick-Overlay-Selected-Parent"
   }
   private zoneDragOverRenderer = (sel: DOMSelection) => {
      sel.element.className = "InSlick-Overlay-DragOver"
      sel.getRoot().render(<InstrumentationToolBox instrumentation={sel.zone} />)
   }
   private zoneHoverRenderer = (sel: DOMSelection) => {
      sel.element.className = "InSlick-Overlay-Hover"
      if (this.selected?.zone !== sel.zone) {
         sel.getRoot().render(<InstrumentationToolBox instrumentation={sel.zone} />)
      }
   }
   zoneUpdate = () => {
      if (this.selected) this.selected.renderOverlay(this.zoneSelectedRenderer, this.zoneSelectedParentRenderer)
   }
   stopPropagation = (e: Event) => {
      e.stopPropagation()
   }
   onContextMenu = (e: KeyboardEvent) => {
      e.preventDefault()
   }
   onZoneKeyDown = (e: KeyboardEvent) => {
      const { onAction } = this.props
      const zone = this.selected?.zone
      if (onAction && zone) {
         if (e.ctrlKey === true) {
            if (e.key === "c") {
               onAction(ZoneAction.Copy, zone)
            }
            if (e.key === "v") {
               onAction(ZoneAction.Paste, zone)
            }
         }
         else {
            if (e.key === "Delete") {
               onAction(ZoneAction.Delete, zone)
            }
         }
      }
   }
   onZoneDragStart = (e: DragEvent) => {
      const { onDrag } = this.props
      if (onDrag) {
         try {
            const data = onDrag(this.selected.zone, e)
            if (data) objectToDataTransfert(data, e.dataTransfer)
            //e.preventDefault()
            e.stopPropagation()
         }
         catch (e) { console.error("onDrag", e) }
      }
   }
   onZoneDragOver = (e: DragEvent) => {
      const hovered = DOMSelection.computeElementSelection(e.target as HTMLElement, this.overlay)
      this.highligthZone(hovered, this.zoneDragOverRenderer)
      e.preventDefault()
      e.stopPropagation()
   }
   onZoneDragLeave = (e: DragEvent) => {
      const relatedTarget = e.relatedTarget
      if (relatedTarget instanceof HTMLElement) {
         if (relatedTarget?.parentElement === null) {
            this.unhighligthZone()
         }
      }
   }
   onZoneDrop = (e: DragEvent) => {
      const { onDrop } = this.props
      try {
         if (this.hovered) {
            onDrop && onDrop(this.hovered.zone, dataTransfertToObject(e.dataTransfer), e)
         }
      }
      catch (e) { console.error("onDrop", e) }
   }
   onZoneClick = (e: MouseEvent) => {
      if (e.ctrlKey) {
         e.stopPropagation()
      }
   }
   onZoneSelect = (e: MouseEvent) => {
      const { onSelect } = this.props
      const target = e.target as HTMLElement
      try {
         const newSelected = DOMSelection.computeElementSelection(target, this.overlay)
         if (newSelected === undefined) {
            return // avoid to change selection on handle
         }
         if (e.ctrlKey) {
            e.stopPropagation()
         }
         if (newSelected?.zone !== this.selected?.zone) {
            onSelect && onSelect(newSelected?.zone, e)
         }
      }
      catch (e) { console.error("onSelect", e) }
   }
   onZoneHover = (e: MouseEvent) => {
      const hovered = DOMSelection.computeElementSelection(e.target as HTMLElement, this.overlay)
      if (hovered && hovered.zone !== this.selected?.zone) {
         this.highligthZone(hovered, this.zoneHoverRenderer)
      }
      else {
         this.unhighligthZone()
      }
   }
   onZoneUnhover = () => {
      if (this.hovered?.isExiting) {
         this.unhighligthZone()
      }
   }
   onZoneExit = (e: MouseEvent) => {
      if (this.hovered) {
         this.hovered.isExiting = true
         setTimeout(this.onZoneUnhover, 1)
      }
   }
   useSupport = (element: HTMLElement) => {
      this.support = element
   }
   useOverlay = (element: HTMLElement) => {
      this.overlay = element
   }
   registerZone(target: InstrumentationZone) {
      this.zones.add(target)
      this.props.onRegisterZone?.(target)
   }
   unregisterZone(target: InstrumentationZone) {
      this.zones.delete(target)
      this.props.onUnregisterZone?.(target)
   }
   render() {
      const { children } = this.props
      return (<div ref={this.useSupport} className="InSlick-Instrumentation-Support">
         <ReactInstrumentationContext.Provider value={this}>
            <div ref={this.useOverlay} />
            {children}
         </ReactInstrumentationContext.Provider>
      </div>)
   }
}


class DOMSelection {
   overlay: HTMLElement = null
   parent: DOMSelection = null
   next: DOMSelection = null
   isLeaf: boolean = false
   isExiting: boolean = false

   // Rendering state
   element: HTMLElement = null
   root: ReactDOMClient.Root = null

   // Instrumentation location
   node: ReactFiberNode = null
   zone: InstrumentationZone = null

   constructor(overlay: HTMLElement) {
      this.overlay = overlay
   }
   getRect() {
      const controller = this.zone.getController()
      if (controller.stretch === InstrumentationBoundingBox.Inner) {
         for (let parent = this.node; parent; parent = ReactTools.getNodeParent(parent)) {
            if (parent.stateNode instanceof HTMLElement) {
               return ReactTools.getHTMLClientRect(parent, this.overlay)
            }
         }
      }
      return ReactTools.getHTMLClientRect(this.node, this.overlay)
   }
   getRoot() {
      if (!this.root) this.root = ReactDOMClient.createRoot(this.element)
      return this.root
   }
   renderOverlay(renderer: (sel: DOMSelection) => void, rendererParent?: (sel: DOMSelection) => void) {
      const rect = this.getRect()
      if (!rect) return
      let new_element: HTMLElement
      if (!this.element) {
         this.element = new_element = document.createElement("div")
         this.element.style.position = "absolute"
      }
      this.element.style.left = `${rect.left}px`
      this.element.style.top = `${rect.top}px`
      this.element.style.width = `${rect.width}px`
      this.element.style.height = `${rect.height}px`
      if (new_element) {
         if (renderer) renderer(this)
         this.overlay.appendChild(this.element)
      }
      if (this.parent && rendererParent) {
         this.parent.renderOverlay(rendererParent, rendererParent)
      }
      if (this.next) {
         this.next.renderOverlay(renderer, rendererParent)
      }
   }
   cleanOverlay() {
      if (this.element) {
         this.element.parentElement.removeChild(this.element)
         this.element = null
      }
      if (this.root) {
         this.root.unmount()
         this.root = null
      }
      if (this.parent) {
         this.parent.cleanOverlay()
      }
      if (this.next) {
         this.next.cleanOverlay()
      }
   }
   static computeElementSelection(element: HTMLElement, overlay: HTMLElement): DOMSelection {
      const node = ReactTools.findNodeFromHTMLElement(element)
      return DOMSelection.computeNodeSelection(node, overlay)
   }
   static computeNodeSelection(node: ReactFiberNode, overlay: HTMLElement): DOMSelection {
      let firstselection: DOMSelection = null
      let lastSelection: DOMSelection = null
      node = node?.child || node
      while (node) {
         const data = (node.elementType instanceof Object) && node.elementType.$$instrumentation
         if (data) {

            // Instrumentation element is a proxy of an instrumentation zone
            const zone = (node.stateNode as IInstrumentationElement).getZone()
            if (zone !== node.stateNode) {
               try {
                  const element = ReactDOM.findDOMNode(zone)
                  node = ReactTools.findNodeFromHTMLElement(element as HTMLElement)
                  continue
               }
               catch (e) {
                  console.error(e)
                  return null
               }
            }

            // Append selection layer for the instrumentation zone
            if (zone.enabled === true) {
               const sel = new DOMSelection(overlay)
               sel.node = node
               sel.zone = zone
               if (lastSelection) {
                  sel.isLeaf = false
                  lastSelection.parent = sel
               }
               else {
                  sel.isLeaf = true
                  firstselection = sel
               }
               lastSelection = sel
            }
         }
         node = ReactTools.getNodeParent(node)
      }
      return firstselection
   }
}

const drag_img = new Image()
drag_img.src = dragImageUrl.toString()

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
