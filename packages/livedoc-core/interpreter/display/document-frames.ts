import React from 'react'
import { ModelContext } from '../execution'
import { ReactClientRect } from '@livedoc/core/react/react-tools'

export interface IDocumentFrame {
   id: number
   readonly title: string
   readonly parent?: IDocumentFrame // Parent widget context
   readonly children: Iterable<IDocumentFrame>
   addSubLayer(sub: IDocumentFrame)
   removeSubLayer(sub: IDocumentFrame)
   getFrameContext(): ModelContext // Running flow in widget
   getFrameRect(): ReactClientRect
}

export interface IDocumentWatcher {
   onAttachFrame(frame: IDocumentFrame)
   onDettachFrame(frame: IDocumentFrame)
}

export function AsDocumentFrame<T extends new (...args: any[]) => any>(BaseClass: T) {
   return class _ extends BaseClass implements IDocumentFrame {
      id: number = 0
      children: IDocumentFrame[] = []
      get title(): string {
         return "?"
      }
      addSubLayer(sub: IDocumentFrame) {
         if (!this.children.includes(sub)) {
            if (sub.id === 0) sub.id = ++DocumentFrame.lastID
            this.children.push(sub)
            if (DocumentFrame.watcher) {
               DocumentFrame.watcher.onAttachFrame(sub)
            }
         }
      }
      removeSubLayer(sub: IDocumentFrame) {
         const index = this.children.indexOf(sub)
         if (index >= 0) {
            this.children.splice(index, 1)
            if (DocumentFrame.watcher) {
               DocumentFrame.watcher.onDettachFrame(sub)
            }
         }
      }
      getFrameContext(): ModelContext {
         return null
      }
      getFrameRect(): ReactClientRect {
         return null
      }
   }
}

export class DocumentFrame extends AsDocumentFrame(Object) {
   static lastID: number = 1
   static watcher: IDocumentWatcher = null
   id: number = 1

   get title(): string {
      return "document"
   }
}

export const document = new DocumentFrame()

export const DocumentFrameContext = React.createContext<IDocumentFrame>(document)

export function findDocumentFrameById(id: number, from: IDocumentFrame = document): IDocumentFrame {
   if (from.id === id) return from
   for (const sub of from.children) {
      const found = findDocumentFrameById(id, sub)
      if (found !== null) return found
   }
   return null
}

class Hightlighted {
   frame: IDocumentFrame = null
   element: HTMLElement = null
   constructor() {
      this.element = window.document.createElement("div")
      this.element.hidden = true
      this.element.style.position = "absolute"
      this.element.style.zIndex = "10000"
      this.element.className = "InSlick-Overlay-DragOver"
      window.document.body.appendChild(this.element)
   }
   update(frame: IDocumentFrame) {
      const rect = frame ? frame.getFrameRect() : null
      this.frame = frame
      if (rect) {
         this.element.style.left = `${rect.left}px`
         this.element.style.top = `${rect.top}px`
         this.element.style.width = `${rect.width}px`
         this.element.style.height = `${rect.height}px`
         this.element.hidden = false
      }
      else {
         this.element.hidden = true
         this.frame = null
      }
   }
   remove() {
      if (this.element) {
         document.body.removeChild(this.element)
      }
   }
}

let hightlighted: Hightlighted = null

export function highlightDocumentFrame(frame: IDocumentFrame) {
   if (!hightlighted) hightlighted = new Hightlighted()
   hightlighted.update(frame)
}

