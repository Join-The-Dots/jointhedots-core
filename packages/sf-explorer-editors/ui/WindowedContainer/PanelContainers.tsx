import React from "react"
import { PanelContainer, PanelInstance } from "../FeaturesLayout"

export type CenterPropsType = {
   current: PanelInstance,
}

export class CenterPanelContainer extends React.Component {
   props: CenterPropsType
   shouldComponentUpdate(nextProps) {
      const curProps = this.props
      return curProps.current !== nextProps.current
   }
   render() {
      const current = this.props.current
      if (current) {
         return (<PanelContainer
            current={current}
            className="WND_panel_container_center WND_panel_container"
         />)
      }
      else {
         return (<div className="WND_panel_container_center WND_panel_container_splash" />)
      }
   }
}

export type SidePropsType = {
   current: PanelInstance,
   size: number,
   vertical?: boolean,
}

export class SidePanelContainer extends React.Component {
   props: SidePropsType
   container: PanelContainer
   shouldComponentUpdate(nextProps) {
      const curProps = this.props
      return curProps.current !== nextProps.current
         || curProps.vertical !== nextProps.vertical
         || curProps.size !== nextProps.size
   }
   getSize() {
      if (this.container) {
         return this.props.vertical ? this.container.width() : this.container.height()
      }
   }
   useContainer = (container: PanelContainer) => {
      this.container = container
   }
   render() {
      const { current, vertical, size } = this.props
      const style = {
         width: vertical ? (size + "%") : "auto",
         height: vertical ? "auto" : (size + "%"),
      }

      if (current) {
         return (<PanelContainer
            ref={this.useContainer}
            className="WND_panel_container_side WND_panel_container"
            style={style}
            current={current}
         />)
      }
      else {
         return null
      }
   }
}

export type ToolbarPropsType = {
   current: PanelInstance,
   size: number,
}

export class ToolbarPanelContainer extends React.Component {
   props: ToolbarPropsType
   container: PanelContainer
   shouldComponentUpdate(nextProps) {
      const curProps = this.props
      return curProps.current !== nextProps.current
         || curProps.size !== nextProps.size
   }
   useContainer = (container: PanelContainer) => {
      this.container = container
   }
   render() {
      const { current, size } = this.props
      const style = size ? { height: `${size}px` } : undefined

      if (current) {
         return (<PanelContainer
            ref={this.useContainer}
            className="WND_panel_container_toolbar WND_panel_container"
            style={style}
            current={current}
         />)
      }
      else {
         return null
      }
   }
}
