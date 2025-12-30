import { PositionType } from "../computeEdgeBox"
import { createPanel } from "./Panels"
import { createFloatingDock, FloatingDockOptions, FloatingTarget, StyleType } from "./Panels/FloatingDock"

export class PopupCancel extends Error {
}

export function openDialog<T>(renderer: (resolve: (data: T) => void) => React.ReactNode, height?: string): Promise<T> {
   return new Promise(resolve => {
      const panel = createPanel()
      let done = false
      panel.display({
         title: "",
         icon: "",
         height,
         content: renderer((res) => {
            if (!done) {
               done = true
               resolve(res)
            }
            panel.close()
         }),
         onClose: () => {
            if (!done) {
               done = true
               resolve(undefined)
            }
         },
      })
      panel.open("modal")
   })
}

export function openContextualMenu<T>(
   target: FloatingTarget,
   renderer: (close: (value?: T) => void) => React.ReactNode | Promise<React.ReactNode>,
   options?: FloatingDockOptions,
): Promise<T> {
   const panel = createPanel()
   const promise = new Promise<T>(async (resolve) => {
      panel.display({
         title: "",
         icon: "",
         content: await renderer((res) => {
            panel.close()
            resolve(res)
         }),
         onClose: () => resolve(undefined),
      })
      panel.open(createFloatingDock(target, options))
   })
   promise["close"] = panel.close.bind(panel)
   return promise
}

