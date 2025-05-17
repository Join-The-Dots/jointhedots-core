import { Button, ButtonIcon } from '@jointhedots/ui/Inputs'
import React, { createRef } from 'react'
import { usePanel } from '../Panels'
import { createFloatingDock } from '../Panels/FloatingDock'


function FlexDock(props: React.HTMLAttributes<HTMLDivElement> & { weight?: number, width?: number, children?: React.ReactNode }) {
   const { weight, width, children } = props
   return <div style={{ flex: weight || 1, minWidth: width }} {...props}>{children}</div>
}

function FixedDock(props: React.HTMLAttributes<HTMLDivElement> & { width?: number, children?: React.ReactNode }) {
   const { width, children } = props
   return <div style={{ flex: 0, minWidth: width }} {...props}>{children}</div>
}

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
   gap?: number
   padding?: number
   vertical?: boolean
   children?: React.ReactNode
}

export class Stack extends React.Component<StackProps> {
   static FlexDock = FlexDock
   static FixedDock = FixedDock
   render(): React.ReactElement {
      const { vertical, gap, padding, style, ...otherProps } = this.props
      const cgap = (gap === undefined) ? 4 : gap
      const cpadding = padding || (cgap / 2)
      const stack_style: React.CSSProperties
         = (vertical === true)
            ? {
               display: "flex",
               flexDirection: "column",
               alignItems: 'stretch',
               gap: cgap,
               padding: cpadding,
               ...style
            }
            : {
               display: "flex",
               flexDirection: "row",
               alignItems: 'center',
               gap: cgap,
               padding: cpadding,
               ...style
            }
      return <div style={stack_style}  {...otherProps} />
   }
}

export interface OverflowStackProps extends StackProps {
   overflow?: (props: { children: React.ReactNode }) => React.ReactNode
}

export class OverflowStack extends React.Component<OverflowStackProps, {
   visibleCount: number
}> {
   containerRef: React.RefObject<HTMLDivElement>
   resizeObserver: ResizeObserver | null

   constructor(props: OverflowStackProps) {
      super(props)
      this.state = {
         visibleCount: React.Children.count(props.children),
      }
      this.containerRef = createRef<HTMLDivElement>()
      this.resizeObserver = null
   }

   componentDidMount() {
      this.updateLayout()
      window.addEventListener("resize", this.updateLayout)

      if (this.containerRef.current) {
         this.resizeObserver = new ResizeObserver(this.updateLayout)
         this.resizeObserver.observe(this.containerRef.current)
      }
   }

   componentDidUpdate(prevProps: OverflowStackProps) {
      if (prevProps.children !== this.props.children) {
         this.updateLayout()
      }
   }

   componentWillUnmount() {
      window.removeEventListener("resize", this.updateLayout)
      if (this.resizeObserver && this.containerRef.current) {
         this.resizeObserver.disconnect()
      }
   }

   updateLayout = () => {
      const container = this.containerRef.current
      if (!container) return

      const childrenArray = Array.from(container.children) as HTMLDivElement[]
      const totalWidth = container.offsetWidth

      let fitCount = 0
      for (let i = 0; i < childrenArray.length - 1; i++) {
         const child = childrenArray[fitCount]
         if (child) {

            const usedWidth = child.offsetLeft + child.offsetWidth
            if (usedWidth > totalWidth) {
               if (child.style.visibility !== 'hidden') {
                  child.style.visibility = 'hidden'
               }
            }
            else {
               if (child.style.visibility !== 'visible') {
                  child.style.visibility = 'visible'
               }
               fitCount++
            }
         }
      }

      this.setState({ visibleCount: fitCount })
   };

   render() {
      const { vertical, gap, padding, style, overflow: OverflowComponent, children, ...otherProps } = this.props
      const { visibleCount } = this.state

      const cgap = (gap === undefined) ? 4 : gap
      const cpadding = padding || (cgap / 2)
      const container_style: React.CSSProperties
         = (vertical === true)
            ? {
               display: "flex",
               flexDirection: "column",
               alignItems: 'stretch',
               overflow: "hidden",
               position: "relative",
               padding: cpadding,
               gap: cgap,
               flex: 1,
            }
            : {
               display: "flex",
               flexDirection: "row",
               alignItems: 'stretch',
               overflow: "hidden",
               position: "relative",
               padding: cpadding,
               gap: cgap,
               flex: 1,
            }

      const childrenArray = React.Children.toArray(this.props.children)

      const overflowItems = childrenArray.slice(visibleCount)
      const Overflow = OverflowComponent || OverflowButton
      return (<div ref={this.containerRef} style={container_style}>
         {childrenArray}
         <div style={{
            display: "flex",
            alignItems: "center",
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
         }}>
            {overflowItems.length > 0 && <Overflow>{overflowItems}</Overflow>}
         </div>
      </div>)
   }
}

function OverflowButton(props: {
   children: React.ReactNode
}) {
   const { children } = props
   const overflowPanel = usePanel(() => {
      return {
         content: children
      }
   }, [children])
   return <ButtonIcon icon="bi:chevron-double-down" variant='primary' onClick={(e) => {
      if (overflowPanel.isOpen) overflowPanel.close()
      else overflowPanel.open(createFloatingDock(e))
   }} />
}
