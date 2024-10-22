import React from 'react'
import { EditionContext, EditionController, EditorMenu, IEditorProvider, ValueProps, sortMatchedControllers } from '..'
import openContextualMenu, { Menu } from '@livedoc/editors/ui/openContextualMenu'
import Icon from '@livedoc/core/ui/Icon'
import "./index.scss"
import { DropZone } from '../DragAndDrop'
import { ValueMenu } from '../ValueMenu'
import { useAsyncState } from '@livedoc/editors/hooks/useAsyncState'

function NoInput(): JSX.Element {
   return <>unsupported</>
}

export default function ValueInput(props: ValueProps & {
   menu?: EditorMenu
   provider: IEditorProvider
}) {
   const { provider, value, typing, menu, onChange, onExpand } = props

   const resolved = useAsyncState(async () => {
      const ctl = await provider.findControllerOf(value, typing)
      if (ctl) return { ctl, value, typing }
      else return null
   }, [value, typing])

   const [expanded, setExpanded] = React.useState(null)
   const context = React.useContext(EditionContext)

   const handleDropWindow = React.useCallback((payload) => {
      const data = payload["text/plain"]
      if (data?.type === "datasource-path") {
         onChange({
            type: "get",
            at: data.path,
         })
      }
   }, [onChange])

   const onSelectMenu = (e) => {
      return openContextualMenu(e.currentTarget, async (close) => {
         const items = []
         const matchings = await provider.listControllerOf(value, typing)
         const apply = (ctl: EditionController) => () => {
            close(onChange(ctl.createValue(typing, value)))
         }
         for (const ctl of sortMatchedControllers(matchings)) {
            items.push(<Menu.Item
               title={ctl.type}
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
      return <>unsupported</>
   }
}
