import React from "react"
import { InstrumentationController, InstrumentationLayout } from "packages/livedoc-ui/instrumentation"
import { IInstrumentationElement, ZoneAction } from "./InstrumentationSupport"
import { InstrumentationZone } from "./InstrumentationZone"
import Icon from "../Icon"
import { DXElement } from "@livedoc/core/interpreter/model"

type PropsType = {
   instrumentation: InstrumentationZone
   sticked?: boolean
}

export class InstrumentationToolBox extends React.Component<PropsType> implements IInstrumentationElement {
   static $$instrumentation = true

   getController(): InstrumentationController {
      const { instrumentation } = this.props
      return instrumentation.getController()
   }
   getZone(): InstrumentationZone {
      const { instrumentation } = this.props
      return instrumentation
   }
   getElement(): DXElement {
      const { instrumentation } = this.props
      return instrumentation.getElement()
   }
   doAction(action: ZoneAction, e) {
      const { instrumentation } = this.props
      const { onAction } = instrumentation.context.props
      if (onAction) {
         onAction(ZoneAction.Delete, instrumentation)
      }
      e.stopPropagation()
   }
   onRemove = (e) => {
      this.doAction(ZoneAction.Delete, e)
   }
   render() {
      const { instrumentation } = this.props
      const controller = instrumentation.getController()
      const infos = controller.getDisplayInfos()

      // Render header
      return (<div
         className="InSlick-Instrumentation-ToolBox"
         title={infos.title}
      >
         <span className="icon">
            <Icon name="code:action/gripper" inversed />
         </span>
         <span className="icon">
            <Icon name="fa:clone" inversed />
         </span>
         <span className="icon">
            <Icon name="fa:paste" inversed />
         </span>
         <span className="icon">
            <Icon name="fa:trash" inversed onClick={this.onRemove} />
         </span>
         <span className="label">
            {infos.title}
         </span>
      </div>)
   }
}

export class InstrumentationHandle extends InstrumentationToolBox {
   static $$instrumentation = true
   constructor(props: PropsType) {
      super(props)
      const { instrumentation } = props
      instrumentation.registerHandle(this)
   }
   componentWillUnmount() {
      const { instrumentation } = this.props
      instrumentation.unregisterHandle(this)
   }
}
