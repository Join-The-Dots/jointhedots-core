import React from 'react'
import { toast } from 'react-toastify'
import Icon from 'components/Icon'
import { JsonInput } from '../InputJson'
import { Tabs } from 'components/Tabs'
import { EditionController, EditionContext, IEditorProvider, ValueProps } from '..'
import Stack from 'components/Stack'
import "./index.scss"
import Button from 'components/Button'
import openContextualMenu from 'components/openContextualMenu'
import { ValueMenu } from '../ValueMenu'
import { useAsyncState } from 'components/hooks/useAsyncState'

function ValueHeading(props: ValueProps & { ctl: EditionController }) {
   const { ctl, name, value } = props
   const context = React.useContext(EditionContext)

   const onToolsMenu = (e) => {
      return openContextualMenu(e.currentTarget, (close) => {
         return <ValueMenu {...props} context={context} onClose={close} />
      })
   }

   return (<Stack>
      <Stack.FixedDock><Icon name={ctl.icon} /></Stack.FixedDock>
      <Stack.FlexDock>{name && <b>{name}</b>} <i>{value?.type || "<error>"}</i></Stack.FlexDock>
      <Stack.FixedDock><Button secondary name={"code:action/config"} onClick={onToolsMenu} /></Stack.FixedDock>
   </Stack>)
}

export default function ValuePanel(props: ValueProps & {
   provider: IEditorProvider
   className?: string
   fallback?: React.ReactNode
}) {
   const { provider, value, typing, className, onChange } = props
   if (!provider) throw new Error("provider missing")

   const [selection, setSelection] = React.useState("main")

   const tracker = React.useContext(EditionContext)
   const onSelect = React.useCallback((selection) => {
      if (tracker.editing) {
         toast.error("Validate current changes")
      }
      else {
         setSelection(selection)
      }
   }, null)

   const ctl_state = useAsyncState(async () => {
      return provider.findControllerOf(value, typing)
   }, [value, typing])

   const ctl = ctl_state.get()
   if (ctl_state.isWaiting || !ctl || !ctl.editor) {
      const { fallback } = props
      if (fallback !== undefined) return fallback
      else return <div className={className}>No Editor</div>
   }

   const tabs = {}
   const { panels } = ctl.editor
   if (panels) {
      for (const name in panels) {
         const panel = panels[name]
         tabs[name] = {
            tab: <Icon name={panel.icon || "code:/editor"} />,
            content: <div className="InSlick-ValueEditor">
               <panel.view
                  value={value}
                  typing={typing}
                  onChange={onChange}
               />
            </div>
         }
      }
   }
   else if (ctl.editor.input) {
      tabs["main"] = {
         tab: <Icon name={"code:/editor"} />,
         content: <div className="InSlick-ValueEditor">
            <ctl.editor.input
               value={value}
               typing={typing}
               onChange={onChange}
            />
         </div>
      }
   }
   tabs["code"] = {
      tab: <Icon name="code:/code" />,
      content: <JsonInput
         value={value}
         typing={typing}
         onChange={onChange}
      />,
   }

   return (<div className={"InSlick-ValuePanel " + (className || "")}>
      <ValueHeading {...props} ctl={ctl} />
      <Tabs
         // atBottom
         items={tabs}
         selection={selection}
         onSelect={onSelect}
      />
   </div>)
}
