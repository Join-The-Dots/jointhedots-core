import React from "react"
import { executeZoneCommand, ElementTooling, ElementInstrumentation, ElementController, InstrumentationKind, ElementCommand } from "./instrumentation"
import { InstrumentationZone } from "./zone"
import Icon from "../Icon/Icon"

type PropsType = {
   zone: InstrumentationZone
   sticked?: boolean
}

export class InstrumentationToolBox extends React.Component<PropsType> implements ElementTooling {
   static $$instrumentation = InstrumentationKind.Tooling

   getController(): ElementController {
      const { zone } = this.props
      return zone.getController()
   }
   getZone(): ElementInstrumentation {
      const { zone } = this.props
      return zone
   }
   getExpression() {
      const { zone } = this.props
      return zone.getElement()
   }
   doAction(action: ElementCommand, e) {
      const { zone } = this.props
      executeZoneCommand(zone, action)
      e.stopPropagation()
   }
   onRemove = (e) => {
      this.doAction(ElementCommand.Delete, e)
   }
   render() {
      const { zone } = this.props
      const controller = zone.getController()
      const infos = controller.getDisplayInfos()

      // Render header
      return (<div
         className="LDX-Instrumentation-ToolBox"
         title={infos.title}
      >
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
   static $$instrumentation = InstrumentationKind.Tooling
   constructor(props: PropsType) {
      super(props)
      const { zone } = props
      zone.registerHandle(this)
   }
   componentWillUnmount() {
      const { zone } = this.props
      zone.unregisterHandle(this)
   }
}
