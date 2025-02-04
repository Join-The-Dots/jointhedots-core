import React, { Component } from "react"
import openContextualMenu, { Menu } from "../openContextualMenu"
import { FeaturesContext, ReactFeaturesContext } from "../FeaturesLayout"

class FrameMenu extends Component<any> {
   static contextType = ReactFeaturesContext
   declare context: FeaturesContext
   handleClick = (feature, panelName) => () => {
      feature.openPanel(panelName)
      this.props.close()
   }
   getWindowsCount(): number {
      let count = 0
      const features = this.context.features
      for (const featureName in features) {
         const feature = features[featureName]
         const panels = feature[".class"].panels
         for (const name in panels) {
            const { userOpenable } = panels[name].descriptor
            if (userOpenable) count++
         }
      }
      return count
   }
   render() {
      const features = this.context.features
      let menuItems = []
      for (const name in features) {
         const feature = features[name]
         const menu = feature[".class"].menu
         if (menu && menu.component) {
            menuItems.push(<menu.component key={name} feature={feature} onClose={this.props.close} />)
         }
      }
      if (this.getWindowsCount() > 0) {
         menuItems.push(<Menu.Section key={menuItems.length} title="Windows"/>)
         for (const featureName in features) {
            const feature = features[featureName]
            const panels = feature[".class"].panels
            for (const name in panels) {
               const { userOpenable, defaultIcon, defaultTitle } = panels[name].descriptor
               userOpenable && menuItems.push(<Menu.Item
                  key={menuItems.length}
                  onClick={this.handleClick(feature, name)}
                  title={defaultTitle || name}
               />)
            }
         }
      }
      return (<>
         {menuItems.length
            ? menuItems
            : <span style={{ color: "#aaa" }}>{"No Items"}</span>}
      </>)
   }
}

export function openFrameMenu(e) {
   openContextualMenu(e, (f) => {
      return (<FrameMenu close={f} />)
   })
}
