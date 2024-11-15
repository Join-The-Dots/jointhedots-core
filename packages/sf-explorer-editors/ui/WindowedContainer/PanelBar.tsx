import React, { Component } from "react"
import { DropZone } from "../DragAndDrop"
import PanelButton, { PanelProps } from "./PanelButton"
import WindowedContainer from "."
import { FeaturesContext, ReactFeaturesContext, PanelInstance } from "../FeaturesLayout"

type PropsType = {
   panel: PanelProps
   frame: WindowedContainer
   minItems: number
   vertical?: boolean
}

const CSS_panel_bar_horizontal = {
   bar: "WND_panel_bar WND_panel_bar_H",
   menu_btn: "WND_panel_menu_btn WND_panel_menu_btn_H WND_center_vertical",
   item_button: "WND_panel_button WND_panel_button_H",
   item_button_CURRENT: "WND_panel_button WND_panel_button_H current",
   item_button_FOCUSED: "WND_panel_button WND_panel_button_H current focused",
   item_button_transform: "rotate(0deg)",
}

const CSS_panel_bar_vertical = {
   bar: "WND_panel_bar WND_panel_bar_V",
   menu_btn: "WND_panel_menu_btn WND_panel_menu_btn_V WND_center_horizontal",
   item_button: "WND_panel_button WND_panel_button_V",
   item_button_CURRENT: "WND_panel_button WND_panel_button_V current",
   item_button_FOCUSED: "WND_panel_button WND_panel_button_V current focused",
   item_button_transform: "rotate(-90deg)",
}

export default class PanelBar extends Component {
   static contextType = ReactFeaturesContext
   context: FeaturesContext
   props: PropsType
   shouldComponentUpdate(nextProps) {
      const curProps = this.props
      return curProps.panel !== nextProps.panel
         || curProps.vertical !== nextProps.vertical
   }
   handleDropPanel = (data) => {
      if (data["panel"]) {
         const wnd = this.context.getPanelInstance(data.panel.id)
         wnd.panelClass.setDefaultDockId(this.props.panel.id)
         wnd && this.context.dockPanel(wnd, this.props.panel.id, true)
      }
   }
   render() {
      const { panel, frame, vertical, minItems } = this.props
      const css = vertical ? CSS_panel_bar_vertical : CSS_panel_bar_horizontal

      // Bar render
      if (panel.items.length > minItems) {
         return (<DropZone onDrop={this.handleDropPanel} className={css.bar}>
            {panel.items.map((item, i) => {
               return (<PanelButton key={i} css={css} item={item} panel={panel} frame={frame} />)
            })}
         </DropZone>)
      }
      else {
         return null
      }
   }
}
