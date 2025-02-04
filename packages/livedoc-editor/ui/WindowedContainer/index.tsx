import React from "react"
import { FeaturesContext, IFeaturePanelsFrame, ReactFeaturesContext, PanelInstance } from "../FeaturesLayout"
import { PanelProps } from "./PanelButton"
import PanelComponents from "./Panels"
import "./index.scss"
import "./theme.scss"

export type DisplayLayoutType
   = "#"
   | "toolbar"
   | "side-left"
   | "side-top"
   | "side-right"
   | "side-bottom"
   | "center-top"

export type DisplayLayout = {
   [dockId: string]: {
      type: DisplayLayoutType
      child?: string // child dockId
      size?: number // percent size metric
      menu?: boolean // enable global menu in corner
   }
}

type DisplayItemType = {
   header?: any
   content?: any
}

type LayoutItemType = {
   size: number
   [customKey: string]: any
}

type LayoutType = LayoutItemType[]

type PropsType = {
   displayLayout?: DisplayLayout
   style?: any
   children?: (item: LayoutItemType) => DisplayItemType
   onChange?: (layout: LayoutType) => void
   onNew?: (data: any) => { [customKey: string]: any }
}

type StateType = {
   panels: { [key: string]: PanelProps }
}

export default class WindowedContainer extends React.Component<PropsType, StateType> implements IFeaturePanelsFrame {
   static contextType = ReactFeaturesContext
   declare context: FeaturesContext

   constructor(props: PropsType, context: FeaturesContext) {
      super(props, context)
      this.state = {
         panels: this.loadDisplayLayout(props.displayLayout)
      }
   }
   componentDidMount(): void {
      this.context.registerFrameComponent(this)
   }
   componentWillUnmount(): void {
      this.context.registerFrameComponent(null)
   }
   UNSAFE_componentWillReceiveProps(nextProps) {
      if (this.props.displayLayout !== nextProps.displayLayout) {
         this.setState({
            panels: this.loadDisplayLayout(nextProps.displayLayout)
         })
      }
   }
   loadDisplayLayout(displayLayout): StateType["panels"] {
      const panels = {}
      for (const dockId in displayLayout) {
         const panelDesc = displayLayout[dockId]
         const panel: PanelProps = {
            ...panelDesc,
            id: dockId,
            current: this.context.getPanelInstance(panelDesc.current),
            items: [],
         }
         panelDesc.items && panelDesc.items.forEach(wid => {
            const wnd = this.context.getPanelInstance(wid)
            if (wnd) {
               wnd.dockId = dockId
               panel.items.push(wnd)
            }
         })
         panels[dockId] = panel
      }
      return panels
   }
   showWindow(wnd: PanelInstance) {
      const panels = this.state.panels
      if (!wnd) return null

      const origin = panels[wnd.dockId]
      if (origin) {
         panels[wnd.dockId] = {
            ...origin,
            current: wnd,
         }
         this.setState({ panels })
      }
   }
   hideWindow(wnd: PanelInstance) {
      const panels = this.state.panels
      if (!wnd) return null

      const origin = panels[wnd.dockId]
      if (origin && origin.current === wnd) {
         panels[wnd.dockId] = {
            ...origin,
            current: null,
         }
         this.setState({ panels })
      }
   }
   dettachPanel(wnd: PanelInstance) {
      const panels = this.state.panels
      if (!wnd) return null

      let origin = panels[wnd.dockId]
      if (origin) {
         origin = {
            ...origin,
            items: origin.items.filter(x => x !== wnd),
         }
         if (origin.current === wnd) origin.current = origin.items[0]
         panels[wnd.dockId] = origin
         this.setState({ panels })
      }

      wnd.dockId = null
   }
   attachPanel(wnd: PanelInstance, dockId: string, foreground: boolean) {
      const panels = this.state.panels
      if (!wnd) return null

      // Detach from origin panel
      if (wnd.dockId !== dockId) {
         let origin = panels[wnd.dockId]
         if (origin && origin.items.indexOf(wnd) >= 0) {
            origin = {
               ...origin,
               items: origin.items.filter(x => x !== wnd),
            }
            if (origin.current === wnd) origin.current = origin.items[0]
            panels[wnd.dockId] = origin
         }
      }

      // Attach to target panel
      let panel = panels[dockId]
      if (panel) {
         panel = { ...panel }
         if (panel.items.indexOf(wnd) < 0) {
            panel.items = [...panel.items, wnd]
         }
         panel.current = foreground ? (wnd || panel.current) : (panel.current || wnd)
         panels[dockId] = panel
      }

      wnd.dockId = dockId
      this.setState({ panels })
   }
   notifyPanelResize(panel: PanelProps, size: number) {
      const panels = this.state.panels
      panels[panel.id] = { ...panel, size }
      this.setState({ panels })
   }
   renderPanel(id: string) {
      const panel = this.state.panels[id]
      return React.createElement(PanelComponents[panel.type] || PanelComponents["#"], {
         id: id,
         frame: this,
         panel: panel,
         children: panel.child && this.renderPanel(panel.child),
      })
   }
   render() {
      return this.renderPanel("#")
   }
}
