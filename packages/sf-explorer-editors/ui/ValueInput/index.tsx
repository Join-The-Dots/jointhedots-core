import React from 'react'
import { EditionContext, EditionDriver, EditorMenu, ValueProps, sortMatchedControllers } from '../../elements/interfaces'
import openContextualMenu, { Menu } from '@sf-explorer/editors/ui/openContextualMenu'
import Icon from '@sf-explorer/core/ui/Icon'
import "./index.scss"
import { DropZone } from '../DragAndDrop'
import { ValueMenu } from '../ValueMenu'
import { useAsyncState } from '@sf-explorer/editors/hooks/useAsyncState'
import { ElementsEditors } from '@sf-explorer/editors/elements'

export function NoInput(props: ValueProps): JSX.Element {
   if (props.value instanceof Object) return <>Unsupported: {props.value.toString()}</>
   return <>Unsupported: typeof {typeof props.value}</>
}

export default function ValueInput(props: ValueProps & {
   menu?: EditorMenu
}) {
   const { value, typing, menu, onChange, onExpand } = props

   const resolved = useAsyncState(async () => {
      const ctl = await ElementsEditors.findControllerOf(value, typing)
      if (ctl) return { ctl, value, typing }
      else return null
   }, [value, typing])

   const [expanded, setExpanded] = React.useState(null)
   const context = React.useContext(EditionContext)

   const handleDropWindow = React.useCallback((payload) => {
      const data = payload["text/plain"]
      if (data?.type === "datasource-path") {
         console.log("TODO: drop datasource-path", data.path)
      }
   }, [onChange])

   const onSelectMenu = (e) => {
      return openContextualMenu(e.currentTarget, async (close) => {
         const items = []
         const matchings = await ElementsEditors.listControllerOf(value, typing)
         const apply = (ctl: EditionDriver) => () => {
            onChange(ctl.createValue(typing, value))
            close()
         }
         for (const ctl of sortMatchedControllers(matchings)) {
            items.push(<Menu.Item
               title={ctl.name}
               icon={ctl.icon}
               onClick={apply(ctl)}
            />)
         }
         return <>
            {items}
         </>
      })
   }

   const state = resolved.get()
   if (state) {
      const { ctl, value, typing } = state
      let View = ctl.editor?.input || NoInput

      const onToolsMenu = (e) => {
         return openContextualMenu(e.currentTarget, (close) => {
            return <ValueMenu {...props} ctl={ctl} context={context} menu={menu} onClose={close} />
         })
      }

      return (<>
         <DropZone
            className='LDX-ValueInput'
            highlightClassName='LDX-ValueInput DropHightlight'
            selectedClassName='LDX-ValueInput DropHover'
            onDrop={handleDropWindow}
         >
            <Icon name={ctl.icon} className="Icon" onClick={onSelectMenu} />
            <View {...props} typing={typing} value={value} onExpand={onExpand || setExpanded} />
            <span className="Tools" onClick={onToolsMenu} >{"\u22EE"}</span>
         </DropZone>
         {expanded}
      </>)
   }
   else if (resolved.isWaiting) {
      return <>...</>
   }
   else {
      return <NoInput {...props} />
   }
}
