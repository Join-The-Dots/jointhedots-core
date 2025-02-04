/* eslint-disable no-use-before-define */
import { PanelClass, PanelComponentType, PanelDescriptor } from "./panel"
import { FeaturesContext } from "./context"
import { Listenable } from "@livedoc/core"

export type FeatureComponent = new (featureClass: FeatureClass) => FeatureInstance

export type FeatureDescriptor = {
   name: string
   title?: string
   panels?: {
      [name: string]: PanelDescriptor & { component: PanelComponentType } | React.ComponentType
   }
   menu?: FeatureMenuType
   dependencies?: FeatureComponent[]
}

export type FeatureMenuType = {
   component: React.ComponentType<{ feature: FeatureInstance, onClose: () => void }>
}

export class FeatureClass {
   instance: FeatureInstance
   component: new (featureClass: FeatureClass) => FeatureInstance
   parameters: Object
   panels: { [key: string]: PanelClass } = {}
   users: Array<FeatureClass>
   dependencies: Array<FeatureClass>
   isMounted: boolean
   menu: FeatureMenuType
   constructor(
      readonly name: string,
      readonly context: FeaturesContext,
   ) {
   }
   setup(component: FeatureComponent, desc: FeatureDescriptor, parameters: { [key: string]: any }) {
      this.parameters = parameters
      this.component = component
      this.menu = desc.menu

      // Setup dependencies
      if (desc.dependencies) {
         for (const dep of desc.dependencies) {
            this.addDependency(dep)
         }
      }

      // Setup panels
      if (desc.panels) {
         for (const name in desc.panels) {
            let panel: PanelClass = null
            const panel_entry = desc.panels[name]
            if (panel_entry instanceof Function) {
               panel = new PanelClass(name, panel_entry["descriptor"] as PanelDescriptor, panel_entry as PanelComponentType, this)
            }
            else {
               panel = new PanelClass(name, panel_entry, panel_entry.component, this)
            }
            for (const key in panel.parameters) {
               const reference = panel.parameters[key]
               const { featureName, path } = this.resolveValueReference(reference, key)
               if (featureName) panel.addLink(featureName, key, path)
               else console.error("Parameter '" + key + "' of panel '" + panel.name + "' has invalid link:", path)
            }
            this.panels[name] = panel
         }
      }
   }
   addUser(user: FeatureClass) {
      if (!this.users) this.users = []
      this.users.push(user)
      return this
   }
   addDependency(component: FeatureComponent) {
      const featureClass = this.context.useFeature(component)
      if (!this.dependencies) this.dependencies = []

      const deps = this.dependencies
      for (let i = 0; i < deps.length; i++) {
         if (deps[i] === featureClass) return
      }
      deps.push(featureClass)
      return featureClass.addUser(this)
   }
   raiseInvalid() {
      let msg = "The feature '" + this.name + "' is invalid or missing"
      if (this.users) {
         msg += ", check dependencies at:"
         for (const user of this.users) {
            msg += "\n > feature '" + user.name + "'"
         }
      }
      throw new Error(msg)
   }
   mount() {
      if (!this.instance) {
         if (!this.component) this.raiseInvalid()

         // Create instance
         this.instance = new (this.component)(this)
         this.context.features[this.name] = this.instance

         // Call will mount
         this.instance.featureWillMount(this.parameters)

         // Mount all dependencies
         if (this.dependencies) {
            for (const dep of this.dependencies) {
               dep.mount()
            }
         }

         // Notify all user features
         if (this.users) {
            for (const user of this.users) {
               user.promptMount()
            }
         }

         // Try to finalize mounting
         this.promptMount()
      }
   }
   promptMount() {
      if (this.instance && !this.isMounted) {
         const deps = this.dependencies
         if (deps) {
            for (let i = 0; i < deps.length; i++) {
               if (!deps[i].instance) return
            }
         }
         this.didMount()
      }
   }
   didMount() {
      if (this.instance && !this.isMounted) {
         this.instance.featureDidMount(this.parameters)
         this.isMounted = true
      }
   }
   resolveValueReference(reference: boolean | string, key: string) {
      let featureName, path
      if (reference === true) {
         featureName = this.name
         path = key
      }
      else if (typeof reference === "string") {
         const parts = reference.split("/")
         if (parts.length > 1) {
            featureName = parts[0] ? parts[0] : this.name
            path = parts[1]
         }
         else {
            featureName = this.name
            path = reference
         }
      }
      return { featureName, path }
   }
}

export class FeatureInstance<S = any> extends Listenable<S> {
   static Descriptor: FeatureDescriptor
   ".class": FeatureClass
   openPanel: Function
   closePanel: Function
   closeAllPanel: Function

   // Life Cycle management functions
   featureWillMount(parameters: { [key: string]: any }) { }
   featureDidMount(parameters: { [key: string]: any }) { }
   featureUpdate(parameters: { [key: string]: any }) { }
   featureWillUnmount() { }

   constructor(featureClass: FeatureClass) {
      super()
      this[".class"] = featureClass
      if (featureClass.panels) {
         this.openPanel = function (panelName: string, options: Object) {
            const fclass = this[".class"]
            fclass.context.openFeaturePanel(fclass.panels[panelName], this, options)
         }
         this.closePanel = function (panelName: string) {
            const fclass = this[".class"]
            fclass.context.closeFeaturePanels(fclass.panels[panelName], this)
         }
         this.closeAllPanel = function () {
            const fclass = this[".class"]
            fclass.context.closeFeaturePanels(null, this)
         }
      }
   }
}
