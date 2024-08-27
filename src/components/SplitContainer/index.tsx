import React, { Component } from "react"
import { ResizableBorder } from "../ResizableBorder"
import "./style.scss"

export type SplitItemType = {
   header?: any,
   content?: any,
   size?: number,
   overflow?: string,
}

export type PropsType = {
   items?: Array<SplitItemType>,
   style?: Object | Array<any>,
}

const defaultArray = []

export default class SplitContainer extends Component<PropsType> {
   items: Array<SplitItemType>
   sizes: Array<number> = []
   modes: Array<number> = []
   styles: Array<Object>

   constructor(props: PropsType) {
      super(props)
      this.updateProps(this.props, false)
   }
   UNSAFE_componentWillReceiveProps(nextProps) {
      this.updateProps(nextProps, true)
   }
   transformDelta(e) {
      return e.deltaY
   }
   updateProps(props: PropsType, shallUpdate: boolean) {
      let hasChanged
      const prevItems = this.items || defaultArray
      const nextItems = props.items || defaultArray
      this.items = nextItems

      // Check items count
      hasChanged = (nextItems.length !== prevItems.length)

      // Update sizes and modes
      for (let i = 0; i < nextItems.length; i++) {
         const item = nextItems[i]
         const prevItem = prevItems[i]
         if (!prevItem || item.size !== prevItem.size) {
            hasChanged = true
            if (item.size === undefined) {
               this.sizes[i] = 0
               this.modes[i] = 0
            }
            else {
               this.sizes[i] = item.size
               if (this.modes[i] === undefined)
                  this.modes[i] = 1
            }
         }
      }

      // Update styles and normalize sizes
      hasChanged && this.applySizes(shallUpdate)
   }
   applySizes(shallUpdate: boolean) {
      const { items, sizes, modes } = this
      this.styles = []
      this.sizes = []

      // Accumulate sizes
      let len = 0
      for (let i = 0; i < items.length; i++) {
         const sz = this.sizes[i] = sizes[i] || items[i].size
         if (sz > 0) len += sz
      }

      // Normalize sizes
      const factor = len ? 100 / len : 1
      for (let i = 0; i < items.length; i++) {
         const style: any = this.styles[i] = {}
         const mode = modes[i], item = items[i]
         this.sizes[i] *= factor
         if (mode > 0) {
            style.overflow = item.overflow || "auto"
            style.flex = sizes[i]
         }
         else if (mode < 0) {
            style.overflow = item.overflow || "auto"
            style.flex = 0
            style.height = 0
         }
         else {
            style.flex = (i < items.length - 1) ? 0 : 1
            style.height = "auto"
         }
      }

      // Update
      if (shallUpdate) this.forceUpdate()
   }
   onResize = (index) => (delta) => {
      const { sizes, modes } = this
      if (modes[index] > 0) {
         const csize = (this.refs[index.toString()] as any).clientHeight

         // Update sizes
         const size = sizes[index]
         delta = Math.max(size, 1) * delta / Math.max(csize, 1)
         sizes[index] += delta
         sizes[index + 1] -= delta

         this.applySizes(true)
      }
   }
   onCollapse = (index) => () => {
      const { modes } = this
      modes[index] = -modes[index]
      this.applySizes(true)
   }
   render() {
      const { items } = this.props
      const { modes } = this
      const contents = []

      if (!items || !Array.isArray(items)) {
         console.error("Empty Collapsible Window is useless.")
         return null
      }

      const lastIndex = items.length - 1
      for (let i = 0; i <= lastIndex; i++) {
         const item = items[i]

         // Render header
         if (item.header) {
            contents.push(<span
               key={contents.length}
               className={modes[i] < 0 ? "SplitHeader CloseArrow" : "SplitHeader OpenArrow"}
               onClick={this.onCollapse(i)}
            >
               {item.header}
            </span>)
         }

         // Render content
         contents.push(<div
            key={contents.length}
            ref={i.toString()}
            style={this.styles[i]}
         >
            {item.content}
         </div>)

         // Render resizer
         if (i < lastIndex) {
            contents.push(<ResizableBorder
               key={contents.length}
               onResize={this.onResize(i)}
               transformDelta={this.transformDelta}
            />)
         }
      }

      return (<div className="SplitContainer">
         {contents}
      </div>)
   }
}
