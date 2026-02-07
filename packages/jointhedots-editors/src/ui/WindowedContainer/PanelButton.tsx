import React, { Component } from "react"
import { DragDropZone } from "../DragAndDrop"
import { stopEvent } from "../event.utils"
import { FeaturesContext, ReactFeaturesContext, PanelInstance } from "../FeaturesLayout"
import WindowedContainer from "."
import { Menu } from "@jointhedots/ui/Layouts"
import { openContextualMenu } from "@jointhedots/ui/Layouts"

export type PanelProps = {
   id: string,
   type: string,
   size: number,
   current: PanelInstance,
   items: PanelInstance[],
   child: string,
}

const CSS_panel_button_animation = {
   "danger": " WND_panel_button_danger",
   "warning": " WND_panel_button_warning",
}

type PropsType = {
   panel: PanelProps,
   frame: WindowedContainer,
   item: PanelInstance,
   css: any,
}

export default class PanelButton extends Component<PropsType> {
   static contextType = ReactFeaturesContext
   declare context: FeaturesContext
   constructor(props: PropsType) {
      super(props)
      props.item.addEventListener("update", this.handleEvent)
   }
   componentWillUnmount() {
      this.props.item.removeEventListener(this.handleEvent)
   }
   handleEvent = () => {
      this.forceUpdate()
   }
   handleClick = () => {
      const { item, panel, frame } = this.props
      if (item === panel.current) {
         frame.hideWindow(item)
      }
      else {
         if (item.animation) item.updateTitle()
         frame.showWindow(item)
      }
   }
   handleDragWindow = () => {
      return {
         "panel": { id: this.props.item.id }
      }
   }
   handleDragMatch = (types) => {
      if (types.find(x => x === "panel")) {
         return true
      }
      const { item, panel } = this.props
      if (panel.current !== item) this.handleClick()
      return false
   }
   handleClose = (e) => {
      if (e.button === 1) {
         stopEvent(e)
         const item = this.props.item
         this.context.unregisterPanel(item)
      }
      else if (e.button === 2) {
         const { item } = this.props
         openContextualMenu(e, (close) => {
            const dockTo = (dockid: string) => () => {
               const wnd = this.context.getPanelInstance(item.id)
               wnd.panelClass.setDefaultDockId(dockid)
               wnd && this.context.dockPanel(wnd, dockid, true)
               close()
            }
            return <>
               <Menu.Item name="Close" onClick={() => {
                  this.context.unregisterPanel(item)
                  close()
               }} />
               <Menu.Separator />
               <Menu.Item name="Dock Left" onClick={dockTo("left")} />
               <Menu.Item name="Dock Right" onClick={dockTo("right")} />
               <Menu.Item name="Dock Center" onClick={dockTo("center")} />
            </>
         })
      }
   }
   render() {
      const { item, panel, css } = this.props
      let className = (panel.current !== item)
         ? css.item_button
         : (item.hasFocus
            ? css.item_button_FOCUSED
            : css.item_button_CURRENT)
      if (item.animation) {
         className += CSS_panel_button_animation[item.animation.mode] || ""
      }
      return (
         <DragDropZone
            className={className}
            onDragStart={this.handleDragWindow}
            onDropMatch={this.handleDragMatch}
            otherProps={{
               title: item.title,
               onClick: this.handleClick,
               onMouseDown: this.handleClose,
            }}
         >
            {item.panel &&
               <div style={{ transform: css.item_button_transform }}>
                  {item.panel.renderPanelTitle()}
               </div>
            }
         </DragDropZone>)
   }
}
