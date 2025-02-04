import React, { useCallback, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import Icon from '@livedoc/ui/Icon'
import { Tabs } from '@livedoc/editor/elements/ui/Tabs'
import { EditionDriver, EditionContext, ValueProps } from '../../interfaces'
import Stack from '@livedoc/editor/ui/Stack'
import "./index.scss"
import Button from '@livedoc/editor/ui/ButtonIcon'
import openContextualMenu from '@livedoc/editor/ui/openContextualMenu'
import { ValueMenu } from '../ElementMenu'
import { useAsyncState } from '@livedoc/editor/hooks/useAsyncState'
import { JSXInput } from '../../../ui/InputCode'
import { ElementsEditors } from '@livedoc/editor/elements'

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

   return (<Stack style={{ paddingLeft: 5 }}>
      <Stack.FixedDock><Icon name={ctl.icon} /></Stack.FixedDock>
      <Stack.FlexDock>{name && <b>{name}</b>} <i>{value?.typing?.type || ""}</i></Stack.FlexDock>
      <Stack.FixedDock><Button variant="watermark" name={"bi:gear"} onClick={onToolsMenu} /></Stack.FixedDock>
      {onClose && <Stack.FixedDock><Button variant="secondary" name={"bi:x"} onClick={onClose} /></Stack.FixedDock>}
   </Stack>)
}

function ValueCodeEditor(props: ValueProps) {
   const { value, onChange } = props
   const code = useMemo(() => {
      return ElementsEditors.stringify(value)
   }, [value])
   const validate = useCallback((text: string) => {

   }, [onChange])
   return <JSXInput
      value={code.text}
      language={code.lang}
      onChange={validate}
   />
}

export default function ElementPanel(props: ValueProps & {
   className?: string
   fallback?: React.ReactNode
   onClose?: () => void
}) {
   const { value, typing, className, onChange, onClose } = props
   //const { displayed, setDisplayed } = useState(null)

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

   const ctl = ElementsEditors.findControllerOf(value)
   if (!ctl || !ctl.editor) {
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

   return (<div className={"LDX-ElementPanel " + (className || "")}>
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
