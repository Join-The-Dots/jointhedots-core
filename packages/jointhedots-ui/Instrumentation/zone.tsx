import React from "react"
import ReactDOMClient from 'react-dom/client'
import { ElementInstrumentation, InstrumentationContext, ElementController, InstrumentationKind, InstrumentationLayout, isInstrumentationCompacted, Instrumentation } from "./instrumentation"
import { InstrumentationHandle, InstrumentationToolBox } from "./handle"
import { ErrorDisplayer } from "@jointhedots/core/react"
import type { ZoneSelection } from "./selection"

export type PropsType = {
   controller: ElementController
   children?: React.ReactNode
}

export class InstrumentationZone extends React.Component<PropsType> implements ElementInstrumentation {
   static $$instrumentation = InstrumentationKind.Zone
   enabled: boolean = false
   selection: ZoneSelection = null
   handle: InstrumentationHandle = null
   header: ZoneHeader = null
   error: Error = null

   /***************************************************************
    * Instrumentation interface
    **************************************************************/

   getTitle(): string {
      return this.getController()?.getDisplayInfos()?.title
   }
   getBase() {
      return this
   }
   getController() {
      return this.props.controller
   }
   updateZone() {
      this.forceUpdate()
      this.handle?.forceUpdate()
   }
   registerHandle(handle: InstrumentationHandle): void {
      this.handle = handle
   }
   unregisterHandle(handle: InstrumentationHandle): void {
      if (this.handle === handle) this.handle = null
   }
   getElement() {
      return this.getController()?.getElement()
   }
   displayTooling(root: ReactDOMClient.Root, hasPreview: boolean) {
      if (hasPreview) {
         root.render(<InstrumentationToolBox zone={this} />)
      }
      else if (!this.handle) {
         if (isInstrumentationCompacted()) {
            root.render(<InstrumentationToolBox sticked zone={this} />)
         }
         else {
            root.render(<InstrumentationHandle sticked zone={this} />)
         }
      }
   }
   get isSelected(): boolean {
      return Instrumentation.focused === this
   }

   /***************************************************************
    * React interface
    **************************************************************/
   constructor(props: PropsType) {
      super(props)
      this.enabled = true// isInstrumentedModel(props.controller.getProgram())
      if (this.enabled) {
         Instrumentation.registerZone(this)
      }
   }
   componentWillUnmount() {
      if (this.enabled) {
         Instrumentation.unregisterZone(this)
      }
   }
   componentDidCatch(e) {
      console.error(e)
      this.error = new Error(e.message)
      this.forceUpdate()
   }
   useHeader = (header: ZoneHeader) => {
      this.header = header
   }
   render() {
      let { controller, children } = this.props
      if (this.error !== null) {
         return <ErrorDisplayer
            error={this.error}
            onRetry={() => {
               this.error = null
               this.forceUpdate()
            }}
         />
      }
      switch (controller.layout) {
         case InstrumentationLayout.Inlaid:
            const compacted = this.enabled ? isInstrumentationCompacted() : true
            return (<InstrumentationContext.Provider value={this}>
               {children}
               {compacted ? null : <ZoneHeader ref={this.useHeader} instrumentation={this} />}
            </InstrumentationContext.Provider>)
         case InstrumentationLayout.Placeholder:
            if (this.enabled) {
               return <div className="LDX-Instrumentation-Placeholder">
                  {children}
               </div>
            }
         case InstrumentationLayout.Minimal:
            return (<InstrumentationContext.Provider value={this}>
               {children || null}
            </InstrumentationContext.Provider>)
      }
   }
}

class ZoneHeader extends React.Component<{
   instrumentation: InstrumentationZone
}> {
   div: HTMLDivElement
   previous_paddingTop: string = ""
   previous_position: string = ""
   componentDidMount() {
      this.updatePosition()
   }
   componentDidUpdate() {
      this.updatePosition()
   }
   updatePosition() {
      const { parentElement } = this.div
      parentElement.style.paddingTop = "20px"
      parentElement.style.position = "relative"
   }
   useElement = (element: HTMLDivElement) => {
      if (element !== this.div) {
         if (this.div) {
            const { parentElement } = this.div
            parentElement.style.paddingTop = this.previous_paddingTop
            parentElement.style.position = this.previous_position
         }
         if (element) {
            const { parentElement } = element
            this.previous_paddingTop = parentElement.style.paddingTop
            this.previous_position = parentElement.style.position
         }
         this.div = element
      }
   }
   render() {
      const { instrumentation } = this.props
      const controller = instrumentation.getController()
      const infos = controller.getDisplayInfos()
      return (<div
         ref={this.useElement}
         className={instrumentation.selection
            ? "LDX-Instrumentation-ZoneHeader selected"
            : "LDX-Instrumentation-ZoneHeader"
         }
         title={infos.title}
      >
         {infos.title}
      </div>)
   }
}
