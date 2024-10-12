import React from 'react'
import Stack from '@livedoc/editors/ui/Stack'
import Icon from '@livedoc/core/ui/Icon'
import "./style.scss"
import { useAsyncState } from '@livedoc/editors/hooks/useAsyncState'

const ListTableContext = React.createContext<number>(0)

export function ExpendableTable(props: {
   children: React.ReactNode | (() => Promise<React.ReactNode>)
}) {
   const content = (props.children instanceof Function) ? props.children : (() => Promise.resolve(props.children as React.ReactNode))
   const children = useAsyncState<React.ReactNode>(content, [props.children])
   return <div className='poly-ListTable'>
      <ListTableContext.Provider value={0}>
         {children.get()}
      </ListTableContext.Provider>
   </div>
}

export function RowFixed(props: {
   children: React.ReactNode
}) {
   return <div>
      {props.children}
   </div>
}

export function RowExpendable(props: {
   title?: string
   label?: React.ReactNode
   init?: boolean
   items?: React.ReactNode
   children?: React.ReactNode | (() => React.ReactNode)
}) {
   const { title, label, items, children } = props
   const [open, setOpen] = React.useState(props.init || false)
   const swapOpen = children && (() => setOpen(!open))
   const level = React.useContext(ListTableContext)

   let iconName
   if (!children) iconName = "code:tree/empty"
   else if (open) iconName = "code:tree/closable"
   else iconName = "code:tree/openable"

   return (<>
      <ListTableContext.Provider value={level + 1}>
         <div>
            <div className='cell-fitted' title={title} style={{ paddingLeft: 10 * level }} onClick={swapOpen}>
               <Stack className='expander'>
                  <Stack.FixedDock><Icon name={iconName} /></Stack.FixedDock>
                  {label}
               </Stack>
            </div>
            {items}
         </div>
         {open && (children instanceof Function
            ? children()
            : children
         )}
      </ListTableContext.Provider >
   </>)
}
