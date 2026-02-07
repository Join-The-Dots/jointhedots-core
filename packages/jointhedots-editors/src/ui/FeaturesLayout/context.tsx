import React, { useContext, useEffect, useState } from "react"
import { createPortal } from 'react-dom'
import { FeatureInstance, FeatureClass, FeatureDescriptor, FeatureComponent } from "./feature"
import { PanelInstance, PanelClass, PanelOptions, PanelEmbed } from "./panel"
import { MapLike } from "@jointhedots/core"

const panelsDocks_Key = "[react-application-frame]#panels-docks"

export interface IFeaturePanelsFrame {
   attachPanel(panel: PanelInstance, dockId: string, foreground?: boolean): void
   dettachPanel(panel: PanelInstance): void
}

export class FeaturesContext {
   featureClasses = new Map<FeatureComponent, FeatureClass>
   features: MapLike<FeatureInstance> = {}
   panelsDocks: { [panelClassId: string]: string } = {}
   panels: MapLike<PanelInstance> = {}
   docks: MapLike<PanelInstance[]> = {}
   focused: PanelInstance = null
   frame: IFeaturePanelsFrame = null
   materializer: (panels: PanelInstance[]) => void = null
   uidGenerator: number = 0

   constructor() {
      try {
         const panelsDocks = JSON.parse(localStorage.getItem(panelsDocks_Key))
         if (panelsDocks && typeof panelsDocks === "object") this.panelsDocks = panelsDocks
      } catch (e) { }
      window.addEventListener("beforeunload", this.unmountFeatures)
   }
   registerFrameComponent = (frame) => {
      this.frame = frame
      if (frame) {
         for (const key in this.panels) {
            const panel = this.panels[key]
            frame.attachPanel(panel, panel.dockId)
         }
      }
   }
   mountFeatures = () => {
      const featureNames = Object.keys(this.featureClasses)

      // Connect features
      featureNames.forEach(name => {
         this.featureClasses[name].mount()
      })

      // Finalize features mount
      featureNames.forEach(name => {
         this.featureClasses[name].didMount()
      })
   }
   unmountFeatures = () => {
      localStorage.setItem(panelsDocks_Key, JSON.stringify(this.panelsDocks))
      Object.keys(this.features).forEach(name => {
         const feature = this.features[name]
         feature.featureWillUnmount()
      })
   }
   useFeature(component: FeatureComponent, parameters?: any): FeatureClass {
      const featDesc = component["Descriptor"] as FeatureDescriptor
      let featClass = this.featureClasses.get(component)
      if (!featClass) {
         featClass = new FeatureClass(featDesc.name, this)
         this.featureClasses.set(component, featClass)
         featClass.setup(component, featDesc, parameters)
      }
      featClass.parameters = parameters
      if (!featClass.instance) {
         featClass.mount()
      }
      else {
         featClass.instance.featureUpdate(parameters)
      }
      return featClass
   }
   dockPanel(panel: PanelInstance, dockId: string, foreground: boolean) {
      this.frame && this.frame.attachPanel(panel, dockId, foreground)
   }
   dettachPanel(panel: PanelInstance) {
      this.frame && this.frame.dettachPanel(panel)
   }
   attachPanel(panel: PanelInstance, dockId: string, foreground?: boolean): void {
      this.frame && this.frame.attachPanel(panel, dockId, foreground)
   }
   registerPanel(panel: PanelInstance) {
      this.panels[panel.id] = panel
      this.materializer?.(this.findAllPanels())
   }
   unregisterPanel(panel: PanelInstance) {
      this.dettachPanel(panel)
      delete this.panels[panel.id]
      panel.close()
      this.materializer?.(this.findAllPanels())
   }
   openSubPanel(panelClass: PanelClass, parent: PanelInstance, options: PanelOptions) {
      if (panelClass && parent) {
         let panel = (options && options.openNew) ? null : this.findOnePanelByClass(panelClass)
         if (!panel) {
            panel = new PanelInstance("#" + (this.uidGenerator++), panelClass, parent, parent.feature, options)
         }
         else {
            options && panel.updateOptions(options)
         }
         this.dockPanel(panel, panel.dockId, true)
      }
   }
   openFeaturePanel(panelClass: PanelClass, feature: FeatureInstance, options: PanelOptions) {
      if (panelClass) {
         let panel = (options && options.openNew) ? null : this.findOnePanelByClass(panelClass)
         if (!panel) {
            panel = new PanelInstance("#" + (this.uidGenerator++), panelClass, null, feature, options)
         }
         else {
            options && panel.updateOptions(options)
         }
         this.dockPanel(panel, panel.dockId, true)
      }
   }
   closeFeaturePanels(panelClass: PanelClass, feature: FeatureInstance) {
      let panels
      if (panelClass) panels = this.findAllPanelsByClass(panelClass)
      else panels = this.findAllPanelsByFeature(feature)
      panels.forEach(panel => this.unregisterPanel(panel))
   }
   getPanelInstance(panelId: string) {
      return this.panels[panelId]
   }
   findOnePanelByClass(panelClass: PanelClass): PanelInstance {
      let panelId
      for (panelId in this.panels) {
         if (this.panels[panelId].panelClass === panelClass) {
            return this.panels[panelId]
         }
      }
      return null
   }
   findAllPanels(): PanelInstance[] {
      const panels = []
      for (const panelId in this.panels) {
         panels.push(this.panels[panelId])
      }
      return panels
   }
   findAllPanelsByFeature(feature: FeatureInstance): PanelInstance[] {
      const panels = []
      if (feature) {
         for (const panelId in this.panels) {
            if (this.panels[panelId].feature === feature) {
               panels.push(this.panels[panelId])
            }
         }
      }
      return panels
   }
   findAllPanelsByClass(panelClass: PanelClass): PanelInstance[] {
      if (panelClass) {
         const panels = []
         for (const panelId in this.panels) {
            if (this.panels[panelId].panelClass === panelClass) {
               panels.push(this.panels[panelId])
            }
         }
         return panels
      }
      else {
         return (this.panels as any).values()
      }
   }
}

export const ReactFeaturesContext = React.createContext<FeaturesContext>(null)

export function FeaturesMaterializer(props: {
   features: FeaturesContext
   children?: React.ReactNode
}) {
   const { features, children } = props
   const [panels, setPanels] = useState<PanelInstance[]>(null)

   useEffect(() => {
      if (features) {
         features.materializer = setPanels
         setPanels(features.findAllPanels())
         return () => features.materializer = null
      }
      else {
         setPanels(null)
      }
   }, [features])

   if (features) {
      return <ReactFeaturesContext.Provider value={features}>
         {panels && panels.map((panel) => {
            return createPortal(<PanelEmbed panel={panel} />, panel.element, panel.id)
         })}
         {children}
      </ReactFeaturesContext.Provider>
   }
   return null
}

export function useFeature<T extends FeatureInstance>(featureType: new (featureClass: FeatureClass) => T): T {
   const features = useContext(ReactFeaturesContext)
   const feature = features.featureClasses.get(featureType)
   return feature?.instance as T
}
