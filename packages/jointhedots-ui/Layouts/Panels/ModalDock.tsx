import ReactDOMClient from 'react-dom/client'
import { getStackZIndex, overlays_stack, StackedDock } from './StackedDock'
import "./style.scss"

export class ModalDock extends StackedDock {
   node: HTMLElement = null
   root: ReactDOMClient.Root = null
   constructor(height?: string) {
      super()
      this.node = document.createElement("div")
      this.node.style.position = "absolute"
      this.node.style.left = "0px"
      this.node.style.top = "0px"
      this.node.style.zIndex = getStackZIndex(overlays_stack.length)
      if (height) {
         this.node.style.setProperty("--jtd-panel-min-height", height)
         this.node.style.setProperty("--jtd-panel-max-height", height)
      }
      else {
         this.node.style.setProperty("--jtd-panel-min-height", "0")
         this.node.style.setProperty("--jtd-panel-max-height", "90%")
      }
   }
   show() {
      if (!this.root) {
         this.root = ReactDOMClient.createRoot(this.node)
         document.body.appendChild(this.node)
      }
   }
   hide() {
      if (this.root) {
         document.body.removeChild(this.node)
         this.root.unmount()
         this.root = null
      }
   }
   unstack = () => {
      if (this.main) {
         this.main.close()
      }
   }
   updateStack(previous) {
      const displayed = this.main?.displayed
      if (displayed) {
         this.show()
         this.root.render(<div className="jtd-panel-modal-dock">
            <div />
            <div onMouseDown={this.unstack}>
               <div onMouseDown={handleStopPropagation}>
                  {displayed.content}
               </div>
            </div>
         </div>)
      }
      else if (previous) {
         this.hide()
      }
   }
}

function handleStopPropagation(evt) {
   evt.stopPropagation()
}
