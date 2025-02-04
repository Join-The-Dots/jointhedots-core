import React from "react"
import ReactDOM from 'react-dom/client'
import { WorkbenchDisplayer, installDisplayerProxy } from "./remote/proxy-displayer"
import { WindowCommandPipe } from "./remote/remote-iframe"
import { TargetRouter } from "./remote/cmds/target"
import { installDeviceProxy } from "./remote/proxy-inspector"
import { DeviceSockets } from "./remote/proxy-sockets"
import { EditedPropName, InstrumentationSupport, Interpreter } from "./interpreter"
import { ComponentsRegistry } from "./library/components"
import { ContextsSettings } from "./web.context"

type PropsType = {
   [name: string]: any
}

class CuboidProduction extends HTMLElement {
   root: ReactDOM.Root = null
   props: PropsType = null
   component: React.ComponentType = null

   setComponent(loader: Promise<React.ComponentType>) {
      loader.then(comp => {
         this.component = comp
         if (this.root) {
            this.render(this.props)
         }
      })
   }
   parseProps(): PropsType {
      const props = {}
      for (const item of this.children) {
         if (item.tagName === "PROPERTY") {
            const name = item.getAttribute("name")
            if (item.getAttribute("json") === "") {
               props[name] = JSON.parse(item.textContent)
            }
            else if (item.getAttribute("html") === "") {
               props[name] = createHtmlPattern(item.children)
            }
         }
      }
      return props
   }
   connectedCallback() {

      // Create DOM renderer
      const ref = this.getAttribute("ref")
      if (ref) {
         const comp = ComponentsRegistry.acquireComponent(ref).fetchResource("view.react")
         this.setComponent(comp)
      }

      // Render content
      this.root = ReactDOM.createRoot(this)
      this.render(this.parseProps())
   }
   disconnectedCallback() {
      if (this.root) {
         this.root.unmount()
         this.root = null
      }
   }
   render(props: PropsType) {
      this.props = props
      if (this.component) {
         this.root.render(<ContextsSettings>
            {React.createElement(this.component, this.props)}
         </ContextsSettings>)
      }
   }
}

class CuboidDevelopment extends CuboidProduction {
   render(props: PropsType) {
      this.props = { ...props, [EditedPropName]: true }
      if (this.component) {
         this.root.render(<InstrumentationSupport editedModel={null}>
            <ContextsSettings>
               {React.createElement(this.component, this.props)}
            </ContextsSettings>
         </InstrumentationSupport>)
      }
   }
}

class Workbench extends HTMLElement {
   root: ReactDOM.Root = null
   connectedCallback() {
      this.root = ReactDOM.createRoot(this)
      this.root.render(<ContextsSettings>
         <WorkbenchDisplayer />
      </ContextsSettings>)
   }
   disconnectedCallback() {
      if (this.root) {
         this.root.unmount()
         this.root = null
      }
   }
}

function createHtmlPattern(pattern: HTMLCollection): React.ReactElement {
   return <HtmlCollectionComponent pattern={pattern} />
}

function HtmlCollectionComponent(props: { pattern: HTMLCollection }) {
   return <div>TODO</div>
}

Interpreter.addEventListener("load", () => {
   const devmode = true
   if (devmode) {

      // Expose device to distributed edition system
      const ide = new WindowCommandPipe(null, "iframe", TargetRouter.executors)
      ide.connect(window.parent)
      DeviceSockets.registerSocket(ide)
      installDeviceProxy()
      installDisplayerProxy()

      // Register web components for developpement
      if (!customElements.get('polycuber-cuboid')) {
         customElements.define('polycuber-cuboid', CuboidDevelopment)
         customElements.define('polycuber-workbench', Workbench)
      }
   }
   else {
      // Register web components
      if (!customElements.get('polycuber-cuboid')) {
         customElements.define('polycuber-cuboid', CuboidProduction)
      }
   }
})
