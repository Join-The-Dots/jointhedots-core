/* eslint-disable no-use-before-define */
import Listenable from "../Events/listenable"
import { WindowClass, WindowDescriptor } from "./Window"
import { FeaturesContext } from "./Context"

export type FeatureComponent = new (featureClass: FeatureClass) => FeatureInstance

export type FeatureDescriptor = {
   name: string
   title?: string
   windows?: {
      [name: string]: WindowDescriptor & {
         component: React.ComponentType
      }
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
   windows: { [key: string]: WindowClass }
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

      // Setup windows
      if (desc.windows) {
         for (const name in desc.windows) {
            if (!this.windows) this.windows = {}
            const windowDesc = desc.windows[name]
            const window = new WindowClass(name, windowDesc, windowDesc.component as any, this)
            for (const key in window.parameters) {
               const reference = window.parameters[key]
               const { featureName, path } = this.resolveValueReference(reference, key)
               if (featureName) window.addLink(featureName, key, path)
               else console.error("Parameter '" + key + "' of window '" + window.name + "' has invalid link:", path)
            }
            this.windows[name] = window
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
   openWindow: Function
   closeWindow: Function
   closeAllWindow: Function

   // Life Cycle management functions
   featureWillMount(parameters: { [key: string]: any }) { }
   featureDidMount(parameters: { [key: string]: any }) { }
   featureUpdate(parameters: { [key: string]: any }) { }
   featureWillUnmount() { }

   constructor(featureClass: FeatureClass) {
      super()
      this[".class"] = featureClass
      if (featureClass.windows) {
         this.openWindow = function (windowName: string, options: Object) {
            const fclass = this[".class"]
            fclass.context.openFeatureWindow(fclass.windows[windowName], this, options)
         }
         this.closeWindow = function (windowName: string) {
            const fclass = this[".class"]
            fclass.context.closeFeatureWindows(fclass.windows[windowName], this)
         }
         this.closeAllWindow = function () {
            const fclass = this[".class"]
            fclass.context.closeFeatureWindows(null, this)
         }
      }
   }
}
