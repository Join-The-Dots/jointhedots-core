import React from 'react'


function FlexDock(props: React.HTMLAttributes<HTMLDivElement> & { weight?: number, width?: number, children?: React.ReactNode }) {
   const { weight, width, children } = props
   return <div style={{ flex: weight || 1, minWidth: width }} {...props}>{children}</div>
}

function FixedDock(props: React.HTMLAttributes<HTMLDivElement> & { width?: number, children?: React.ReactNode }) {
   const { width, children } = props
   return <div style={{ flex: 0, minWidth: width }} {...props}>{children}</div>
}

export type StackProps = React.HTMLAttributes<HTMLDivElement> & {
   gap?: number
   vertical?: boolean
   children?: React.ReactNode
}

export default class Stack extends React.Component<StackProps> {
   static FlexDock = FlexDock
   static FixedDock = FixedDock
   render(): React.ReactElement {
      const { vertical, gap, style, ...otherProps } = this.props
      const cgap = (gap === undefined) ? 4 : gap
      const cpadding = cgap / 2
      if (vertical === true) {
         return <div style={{ display: "flex", flexDirection: "column", alignItems: 'stretch', gap: cgap, padding: cpadding, ...style }} {...otherProps} />
      }
      else {
         return <div style={{ display: "flex", flexDirection: "row", alignItems: 'center', gap: cgap, padding: cpadding, ...style }} {...otherProps} />
      }
   }
}
