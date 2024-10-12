import React from 'react'
import "./index.scss"

export type TabItem = {
   tab: any,
   content: any,
}

export function TabsBar(props: {
   atBottom?: boolean
   items: { [key: string]: TabItem }
   selection: string
   onSelection?: (selection: string) => void
}) {
   const { atBottom, selection, items, onSelection } = props
   const list = []
   for (const key in items) {
      list.push(<div
         key={key}
         className={key === selection ? "Item active" : "Item"}
         onClick={() => onSelection(key)}
      >
         {items[key].tab}
      </div>)
   }
   return (<div className={atBottom ? "LDX-TabsBar atBottom" : "LDX-TabsBar atTop"}>
      {list}
   </div>)
}

export function Tabs(props: {
   atBottom?: boolean
   items: { [key: string]: TabItem }
   selection: string
   onSelect: (selection: string) => void
}) {
   const { items, atBottom, selection, onSelect } = props
   const item = items[selection]
   const bar = <TabsBar
      atBottom={atBottom}
      items={items}
      selection={selection}
      onSelection={onSelect}
   />
   return (<div className="LDX-Tabs">
      {!atBottom && bar}
      <div className="content">
         {item?.content}
      </div>
      {atBottom && bar}
   </div>)
}
