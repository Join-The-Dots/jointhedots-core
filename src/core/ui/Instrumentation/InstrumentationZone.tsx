import React from "react"
import ReactDOMClient from 'react-dom/client'
import { ElementInstrumentation, InstrumentationContext, ElementController, InstrumentationKind, InstrumentationLayout, isInstrumentationCompacted, isSelectedZone, registerZone, unregisterZone } from "."
import { InstrumentationHandle, InstrumentationToolBox } from "./InstrumentationHandle"
import { ErrorDisplayer } from "../ErrorBoundary"

export type PropsType = {
   controller: ElementController
   children?: React.ReactNode
}

export class InstrumentationZone extends React.Component<PropsType> implements ElementInstrumentation {
   static $$instrumentation = InstrumentationKind.Zone
   enabled: boolean = false
   handle: InstrumentationHandle = null
   header: ZoneHeader = null
   error: Error = null

   /***************************************************************
    * Instrumentation interface
    **************************************************************/
   get isSelected(): boolean {
      return isSelectedZone(this)
   }
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
   getDescriptor() {
      return this.getController()?.getDescriptor()
   }
   setDescriptor(descriptor: any) {
      return this.getController()?.setDescriptor(descriptor)
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

   /***************************************************************
    * React interface
    **************************************************************/
   constructor(props: PropsType) {
      super(props)
      this.enabled = true// isInstrumentedModel(props.controller.getProgram())
      if (this.enabled) registerZone(this)
   }
   componentWillUnmount() {
      if (this.enabled) {
         unregisterZone(this)
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

class ZoneHeader extends React.Component {
   props: {
      instrumentation: InstrumentationZone
   }
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
         className={instrumentation.isSelected
            ? "LDX-Instrumentation-ZoneHeader selected"
            : "LDX-Instrumentation-ZoneHeader"

         }
         title={infos.title}
      >
         {infos.title}
      </div>)
   }
}
