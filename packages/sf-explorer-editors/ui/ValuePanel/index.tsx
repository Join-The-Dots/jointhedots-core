import React, { useMemo } from 'react'
import { toast } from 'react-toastify'
import Icon from '@sf-explorer/core/ui/Icon'
import { JsonInput } from '../InputJson'
import { Tabs } from '@sf-explorer/editors/ui/Tabs'
import { EditionDriver, EditionContext, IEditorProvider, ValueProps } from '../editor-context'
import Stack from '@sf-explorer/editors/ui/Stack'
import "./index.scss"
import Button from '@sf-explorer/editors/ui/ButtonIcon'
import openContextualMenu from '@sf-explorer/editors/ui/openContextualMenu'
import { ValueMenu } from '../ValueMenu'
import { useAsyncState } from '@sf-explorer/editors/hooks/useAsyncState'
import { JSXInput } from '../InputCode'

function ValueHeading(props: ValueProps & {
   ctl: EditionDriver
   onClose?: () => void
}) {
   const { ctl, name, value, onClose } = props
   const context = React.useContext(EditionContext)

   const onToolsMenu = (e) => {
      return openContextualMenu(e.currentTarget, (close) => {
         return <ValueMenu {...props} context={context} onClose={close} />
      })
   }

   return (<Stack>
      <Stack.FixedDock><Icon name={ctl.icon} /></Stack.FixedDock>
      <Stack.FlexDock>{name && <b>{name}</b>} <i>{value?.type || "<error>"}</i></Stack.FlexDock>
      <Stack.FixedDock><Button secondary name={"bi:gear"} onClick={onToolsMenu} /></Stack.FixedDock>
      {onClose && <Stack.FixedDock><Button secondary name={"bi:x"} onClick={onClose} /></Stack.FixedDock>}
   </Stack>)
}

export default function ValuePanel(props: ValueProps & {
   provider: IEditorProvider
   className?: string
   fallback?: React.ReactNode
   onClose?: () => void
}) {
   const { provider, value, typing, className, onChange, onClose } = props
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
            tab: <Icon name={panel.icon || "bi:pencil"} />,
            content: <div className="LDX-TabArea">
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
         tab: <Icon name="bi:pencil" />,
         content: <div className="LDX-TabArea">
            <ctl.editor.input
               value={value}
               typing={typing}
               onChange={onChange}
            />
         </div>
      }
   }
   tabs["code"] = {
      tab: <Icon name="bi:code" />,
      content: <ValueCodeEditor {...props} />,
   }

   return (<div className={"LDX-ValuePanel " + (className || "")}>
      <ValueHeading
         {...props}
         ctl={ctl}
         onClose={onClose}
      />
      <Tabs
         // atBottom
         items={tabs}
         selection={selection}
         onSelect={onSelect}
      />
   </div>)
}

function ValueCodeEditor(props: ValueProps) {
   const { value, provider, onChange } = props
   const code = useMemo(() => {
      return provider.stringify(value)
   }, [value])
   return <JSXInput
      value={code.text}
      language={code.lang}
      onChange={onChange}
   />
}
