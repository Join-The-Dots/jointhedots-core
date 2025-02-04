/* eslint-disable no-use-before-define */
import React, { Component, createRef, useContext, useEffect } from "react"
import { FeatureClass, FeatureInstance } from "./feature"
import { FeaturesContext, ReactFeaturesContext } from "./context"
import { Listenable, MapLike } from "@livedoc/core"
import { ErrorBoundary } from "@livedoc/core/react"
import Icon from "@livedoc/ui/Icon"

export type PanelDescriptor = {
   layouting?: LayoutingType
   keepAlive?: boolean
   userOpenable?: boolean
   parameters?: { [key: string]: boolean | string } | string[]
   defaultTitle?: string
   defaultDockId?: string
   defaultParameters?: { [key: string]: any }
   defaultIcon?: PanelIconType
}

export type PanelOptions = {
   title?: string
   icon?: PanelIconType
   dockId?: string
   parameters?: { [key: string]: any }
   openNew?: boolean
}

export type ParameterLink = {
   [key: string]: string, // key -> path
}

export type LayoutingType
   = "fitted" // First element is forced to the panel size, other are ejected
   | "flexible" // Elements are set in a flex column dipslay
   | "boxed" // Elements are set in a unsized box with scrollbar

export type PanelComponentType = new () => PanelComponent

export type PanelIconType = string

export type PanelAnimationType = {
   mode: string
   duration: number
   timer?: any
}

export class PanelClass {
   classId: string
   name: string
   context: FeaturesContext
   featureClass: FeatureClass
   component: PanelComponentType // constructor of PanelComponent
   descriptor: PanelDescriptor

   parameters: { [key: string]: string }
   panels: { [key: string]: PanelClass }
   links: { [key: string]: ParameterLink }

   constructor(name: string, desc: PanelDescriptor, component: PanelComponentType, featureClass: FeatureClass) {
      this.classId = featureClass.name + ":" + name
      this.name = name
      this.component = component
      this.context = featureClass.context
      this.descriptor = {
         layouting: "flexible",
         ...component['Descriptor'],
         ...desc,
      }
      this.parameters = this.descriptor.parameters as any
      this.featureClass = featureClass
      console.assert(isDerivedFrom(this.component, PanelComponent),
         "Panel '", this.name, "' shall be based on PanelComponent")
   }
   getDefaultDockId() {
      const { panelsDocks } = this.context
      return panelsDocks[this.classId] || this.descriptor.defaultDockId
   }
   setDefaultDockId(defaultDockId) {
      const { panelsDocks } = this.context
      if (this.descriptor.defaultDockId !== defaultDockId) {
         panelsDocks[this.classId] = defaultDockId
      }
      else {
         delete panelsDocks[this.classId]
      }
   }
   addLink(featureName: string, key: string, path: string) {
      if (!this.links) this.links = {}
      if (!this.links[featureName]) this.links[featureName] = {}
      this.links[featureName][key] = path
   }
   updateParametersFor(instance, featureName, bind: boolean = false) {
      const { features } = this.context
      const featInstance = features[featureName]
      if (featInstance) {
         const featLinks = this.links[featureName]
         bind && featInstance.addEventListener(Object.keys(featLinks), instance.updateParams)
         for (const key in featLinks) {
            const path = featLinks[key]
            instance.parameters[key] = featInstance[path]
         }
      }
   }
   connectParameters(instance: PanelInstance) {
      if (this.links) {
         for (const featureName in this.links) {
            this.updateParametersFor(instance, featureName, true)
         }
      }
   }
   disconnectParameters(instance: PanelInstance) {
      if (this.links) {
         const { features } = this.context
         for (const featureName in this.links) {
            const featInstance = features[featureName]
            featInstance && featInstance.removeEventListener(instance.updateParams)
         }
      }
   }
}

export class PanelInstance extends Listenable {

   // Definition
   id: string = null
   panelClass: PanelClass = null
   panel: PanelComponent = null
   embed: PanelEmbed = null

   // Hierarchy
   parent: PanelInstance = null
   feature: FeatureInstance = null
   container: PanelContainer = null
   element: HTMLElement = null

   // Options
   dockId: string = null
   title: string = null
   icon: PanelIconType = null
   parameters: MapLike<any> = null
   animation: PanelAnimationType = null
   keepAlive: boolean = false
   style: string = null
   lastError: Error = null

   constructor(panelId: string, panelClass: PanelClass,
      parent: PanelInstance, feature: FeatureInstance, options: PanelOptions
   ) {
      super()
      const { descriptor } = panelClass
      this.id = panelId
      this.panelClass = panelClass
      this.parent = parent
      this.feature = feature
      this.keepAlive = descriptor.keepAlive || false
      this.style = "WND_frame_panel " + descriptor.layouting
      this.element = document.createElement("div")
      this.element.className = this.style
      this.title = descriptor.defaultTitle
      this.icon = descriptor.defaultIcon
      this.dockId = panelClass.getDefaultDockId()
      this.parameters = {
         instance: this,
         onChange: (parameters) => this.updateOptions({ parameters }),
      }
      this.panelClass.connectParameters(this)
      this.updateOptions(options)
      panelClass.context.registerPanel(this)
   }
   get context() {
      return this.panelClass.context
   }
   get hasFocus() {
      return this.context.focused === this
   }
   componentDidCatch(error: Error) {
      this.lastError = error
      this.update()
   }
   setPanel(panel: PanelComponent) {
      this.panel = panel
      this.executeEvent("update")
   }
   updateParams = (feature, prevState) => {
      this.panelClass.updateParametersFor(this, feature[".class"].name)
      this.update()
   }
   updateOptions(options: PanelOptions) {
      if (options) {
         if (options.title) this.title = options.title
         if (options.icon) this.icon = options.icon
         if (options.dockId) this.dockId = options.dockId
         if (options.parameters) {
            this.parameters = {
               ...this.parameters,
               ...options.parameters,
            }
         }
      }
      this.update()
   }
   updateTitle(animation?: PanelAnimationType) {

      // Clear previous animation
      if (this.animation) {
         const { timer } = this.animation
         if (timer) clearTimeout(timer)
         this.animation = undefined
      }

      // Prepare new animation
      if (animation) {
         const { duration } = animation
         if (duration) {
            animation.timer = setTimeout(this.updateTitle.bind(this), duration)
         }
         this.animation = animation
      }

      this.dispatchEvent("update")
   }
   update() {
      this.embed?.forceUpdate()
   }
   close() {
      this.panelClass.disconnectParameters(this)
      if (this.element.parentElement) {
         this.element.parentElement.removeChild(this.element)
      }
   }
}

export class PanelEmbed extends React.Component<{ panel: PanelInstance }> {
   componentDidMount() {
      const { panel } = this.props
      panel.embed = this
   }
   componentWillUnmount() {
      const { panel } = this.props
      panel.embed = null
   }
   render() {
      const { panel } = this.props
      const { panelClass, parameters } = panel
      return <ErrorBoundary>
         {React.createElement(panelClass.component, parameters)}
      </ErrorBoundary>
   }
}

export type PropsType = {
   current: PanelInstance,
   className: string,
   style?: any,
}

export class PanelContainer extends React.Component<PropsType> {
   static contextType = ReactFeaturesContext
   declare context: FeaturesContext
   instance: PanelInstance
   root: HTMLElement

   componentDidMount() {
      this.mountPanel(this.props.current)
   }
   UNSAFE_componentWillReceiveProps(nextProps) {
      if (this.props.current !== nextProps.current) {
         this.unmountPanel()
         this.mountPanel(nextProps.current)
      }
   }
   componentWillUnmount() {
      this.unmountPanel()
   }
   mountPanel(instance: PanelInstance) {
      this.instance = instance
      if (instance) {
         if (instance.element.parentElement !== this.root) {
            this.root.appendChild(instance.element)
         }
         instance.element.className = instance.style
         instance.container = this
      }
   }
   unmountPanel() {
      if (this.instance && this.instance.container === this) {
         if (this.instance.keepAlive) {
            this.instance.element.className = this.instance.style + ' hide'
         }
         else if (this.instance.element.parentElement === this.root) {
            this.root.removeChild(this.instance.element)
         }
         this.instance.container = null
      }
   }
   width() {
      return this.root && this.root.clientWidth
   }
   height() {
      return this.root && this.root.clientHeight
   }
   focus = (e) => {
      const prev_focused = this.instance.context.focused
      if (prev_focused !== this.instance) {
         this.instance.context.focused = this.instance
         if (prev_focused) {
            prev_focused.executeEvent("blur", e)
            prev_focused.dispatchEvent("update")
         }
         if (this.instance) {
            this.instance.executeEvent("focus", e)
            this.instance.updateTitle()
         }
      }
   }
   handle = (type: string) => (e) => {
      this.instance && this.instance.executeEvent(type, e)
   }
   useRoot = (root: HTMLElement) => {
      this.root = root
   }
   render() {
      const { className, style } = this.props
      return (<div
         ref={this.useRoot}
         tabIndex={1}
         className={className}
         style={style}
         onKeyDown={this.handle("keydown")}
         onKeyUp={this.handle("keyup")}
         onFocus={this.focus}
      />)
   }
}

export class PanelComponent<TFeatureInstance extends FeatureInstance = FeatureInstance, P = {}, S = {}, SS = any> extends Component<P & { instance: PanelInstance }, S, SS> {
   static Descriptor: PanelDescriptor
   instance: PanelInstance
   feature: TFeatureInstance

   constructor(props) {
      super(props)
      this.instance = props.instance
      this.feature = props.instance.feature
      this.instance.setPanel(this)
   }
   isPanel() {
      return true
   }
   addEventListener() {
      this.instance.addEventListener.apply(this.instance, arguments)
   }
   removeEventListener() {
      this.instance.removeEventListener.apply(this.instance, arguments)
   }
   openPanel(panelClassID: string, options: PanelOptions) {
      const { panelClass } = this.instance
      panelClass.context.openSubPanel(panelClass.panels[panelClassID], this.instance, options)
   }
   closePanel() {
      const { panelClass } = this.instance
      panelClass.context.unregisterPanel(this.instance)
   }
   updatePanelTitle(animation: PanelAnimationType) {
      this.instance.updateTitle(animation)
   }
   renderPanelIcon() {
      const { icon } = this.instance
      if (icon) return <Icon name={icon} />
      else return null
   }
   renderPanelTitle() {
      return <React.Fragment>
         {this.renderPanelIcon()}
         {this.instance.title}
      </React.Fragment>
   }
}

function isDerivedFrom(derived, base) {
   while (derived) {
      derived = Object.getPrototypeOf(derived)
      if (derived === base) return true
   }
   return false
}
