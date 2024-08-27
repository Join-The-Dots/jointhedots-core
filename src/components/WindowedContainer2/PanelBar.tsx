import React, { Component } from "react"
import { DropZone } from "../DragAndDrop"
import PanelButton, { PanelProps } from "./PanelButton"
import WindowedContainer from "."
import { FeaturesContext, ReactFeaturesContext } from "components/FeaturesLayout"

type PropsType = {
   panel: PanelProps,
   frame: WindowedContainer,
}

const CSS_panel_bar_horizontal = {
   bar: "WND_panel_bar WND_panel_bar_H",
   menu_btn: "WND_panel_menu_btn WND_panel_menu_btn_H WND_center_vertical",
   item_button: "WND_panel_button",
   item_button_CURRENT: "WND_panel_button current",
   item_button_FOCUSED: "WND_panel_button current focused",
   item_button_transform: "rotate(0deg)",
}

export default class PanelBar extends Component {
   static contextType = ReactFeaturesContext
   context: FeaturesContext
   props: PropsType
   shouldComponentUpdate(nextProps) {
      const curProps = this.props
      return curProps.panel !== nextProps.panel
   }
   handleDropWindow = (data) => {
      if (data["window"]) {
         const wnd = this.context.getWindowInstance(data.window.id)
         wnd.windowClass.setDefaultDockId(this.props.panel.id)
         wnd && this.context.dockWindow(wnd, this.props.panel.id, true)
      }
   }
   render() {
      const { panel, frame } = this.props
      const css = CSS_panel_bar_horizontal

      // Bar render
      return (<DropZone onDrop={this.handleDropWindow} className={css.bar}>
         {panel.items.map((item, i) => {
            return (<PanelButton key={i} css={css} item={item} panel={panel} frame={frame} />)
         })}
      </DropZone>)
   }
}
