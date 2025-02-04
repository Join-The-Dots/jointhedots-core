import React from 'react'
import { PanelComponent, PanelDescriptor } from '@livedoc/editor/ui/FeaturesLayout'
import { ViewEditor } from '../../editor'
import { DXElement, DocumentLayer, DocumentModel, ExpressionTemplate } from '@livedoc/core'
import { ExpendableNode } from '@livedoc/editor/ui/ExpendableNode'
import Icon from '@livedoc/ui/Icon'
import Stack from '@livedoc/editor/ui/Stack'
import "./index.scss"
import Button from '@livedoc/editor/ui/ButtonIcon'
import openContextualMenu, { Menu } from '@livedoc/editor/ui/openContextualMenu'
import { DescriptorEditionSelection } from '@livedoc/editor/designer/selection'
import { ModelView, StateView } from '@livedoc/core/remote'
import { ContextInspector, IDeviceWatcher, DeviceInspector, ModelInspector, StateInspector, IContextWatcher } from '@livedoc/core/remote'
import { AST } from "@livedoc/core"
import { getJSONSchemaName } from '@livedoc/core'
import { DragZone } from '@livedoc/editor/ui/DragAndDrop'
import { DXProperty } from '@livedoc/core'

function orderStateList(list: React.ReactElement[]): React.ReactElement[] {
   return list.sort((a, b) => {
      const c0 = a.props.order - b.props.order
      if (c0) return c0
      const name_a: string = a.props.name
      const name_b: string = b.props.name
      return (name_a && name_b) ? name_a.localeCompare(name_b) : 0
   })
}

function DataStateNode(props: {
   order?: number
   name: string
   path: string
   state?: StateInspector
   template: ExpressionTemplate
   selection: DescriptorEditionSelection
   onSelect: (value: ExpressionTemplate) => void
}) {
   const { selection, name, path, template, state, onSelect } = props

   const onClick = React.useCallback(() => {
      template && onSelect(template)
   }, [template])

   const onDragStart = React.useCallback(() => {
      return {
         "text/plain": {
            type: "datasource-path",
            path,
         }
      }
   }, [path])

   return <StateView inspector={state}>
      {(state) => {
         const members = []

         const dataKeys = new Set<string>()
         if (template) {
            for (const member of template.getMetaMembers()) {
               members.push(<DataStateNode
                  key={members.length}
                  name={member.name}
                  path={member.getPath()}
                  template={member}
                  state={state?.getMeta(member.name)}
                  selection={selection}
                  onSelect={onSelect}
               />)
            }
            for (const member of template.getMembers()) {
               dataKeys.add(member.name)
               members.push(<DataStateNode
                  key={members.length}
                  name={member.name}
                  path={member.getPath()}
                  template={member}
                  state={state?.getData(member.name)}
                  selection={selection}
                  onSelect={onSelect}
               />)
            }
         }
         if (state && state.datas) {
            for (const member of state.datas) {
               if (!dataKeys.has(member.name)) {
                  members.push(<DataStateNode
                     key={members.length}
                     name={member.name}
                     path={`${path}/${member.name}`}
                     template={null}
                     state={member}
                     selection={selection}
                     onSelect={onSelect}
                  />)
               }
            }
         }

         const expr = template ? template.getExpression() : null
         const icon = template ? template.icon : "code:symbol/field"
         return <ExpendableNode
            label={<DragZone otherProps={{ className: "DatasPanel-Item", title: path, onClick }} onDragStart={onDragStart}>
               <Stack.FixedDock><Icon name={icon} /></Stack.FixedDock>
               <Stack.FlexDock>{expr ? <b>{name}</b> : name}</Stack.FlexDock>
               <Stack.FlexDock><i>{state ? state.value : getJSONSchemaName(template.getSchema())}</i></Stack.FlexDock>
            </DragZone>}
         >
            {members.length > 0 ? members : null}
         </ExpendableNode>
      }}
   </StateView>
}

class DataLayerNode extends React.Component<{
   selection: DescriptorEditionSelection
   layer: DocumentLayer
   imodel: ModelInspector
   onSelectTemplate: (value: ExpressionTemplate) => void
   onSelectExpr: (xpr: DXElement) => void
   onAddOperator: (name: string, desc: AST.Any, layer: DocumentLayer) => void
}, {
   icontext: ContextInspector
}> implements IContextWatcher {

   constructor(props) {
      super(props)
      this.state = { icontext: this.selectContext(props.imodel) }
   }
   UNSAFE_componentWillReceiveProps(nextProps) {
      const icontext = this.selectContext(nextProps.imodel)
      if (icontext !== this.state.icontext) {
         if (this.state.icontext) this.state.icontext.removeWatcher(this)
         if (icontext) icontext.addWatcher(this)
         this.setState({ icontext })
      }
   }
   selectContext(imodel: ModelInspector) {
      if (imodel) {
         const { layer } = this.props
         const infos = imodel.findContextOf(layer)
         if (infos) return imodel.support.acquireContextInspector(infos.contextId)
      }
      return null
   }
   onContextChange(target: ContextInspector) {
      this.forceUpdate()
   }
   onContextClose(target: ContextInspector) {
   }
   onAddMenu = (e) => {
      const { layer, onAddOperator } = this.props
      openContextualMenu(e, (close) => {
         return <>TODO</>
         /* const add = (type: string) => () => {
            const ctl = ExpressionEditors.getControllerOf(type)
            const value = ctl.createValue(CommonTypes.any)
            close()
            openDialog<void>((close) => {
               const ok = (name: string) => {
                  if (layer.namespace[name]) {
                     toast.error(`'${name}' is already used`)
                  }
                  else if (!isValidTechnicalName(name)) {
                     toast.error(`'${name}' is not a valid name`)
                  }
                  else {
                     onAddOperator(name, value, layer)
                     close()
                  }
               }
               const cancel = () => {
                  close()
               }
               return <Stack>
                  <Stack.FlexDock>
                     <InputText title="Name" value="" onChange={ok} />
                  </Stack.FlexDock>
                  <Button name="code:action/cancel" onClick={cancel} />
               </Stack>
            })
         }
         return (<>
            {Object.keys(ExpressionEditors.types).map(key => {
               const ctl = ExpressionEditors.types[key]
               if (ctl.createValue && ctl.kind === "operator") {
                  return <Menu.Item
                     key={key}
                     title={ctl.type}
                     icon={ctl.icon}
                     onClick={add(ctl.type)}
                  />
               }
            })}
         </>) */
      }, "down-right")
   }

   render() {
      const { selection, layer, onSelectExpr, onSelectTemplate } = this.props
      const { icontext } = this.state

      const sources = []
      for (const name in layer.namespace) {
         const op = layer.namespace[name]
         if (!op.getSupport()) {
            let order = 1
            if (op === layer.output?.emitter) order = 1000
            else if (op instanceof DXProperty) order = 0
            const state = icontext?.getRoot(op.name)//this.inspector?.operators?.get(op)
            const template = op.getTemplate()
            sources.push(<DataStateNode
               key={op.name}
               order={order}
               name={op.name}
               path={`${layer.name}${template.getPath()}`}
               state={state}
               template={template}
               selection={selection}
               onSelect={onSelectTemplate}
            />)
         }
      }

      return <div className='DatasPanel-Block'>
         <Stack onClick={() => onSelectExpr(layer.support)}>
            <Stack.FlexDock>{layer.name || "View"}</Stack.FlexDock>
            <Button name="code:action/add" variant="secondary" onClick={this.onAddMenu} />
         </Stack>
         {orderStateList(sources)}
      </div>
   }
}

export class DatasPanel extends PanelComponent<ViewEditor, {
   model: DocumentModel
   selection: DescriptorEditionSelection
   inspector: DeviceInspector
}> implements IDeviceWatcher {
   static Descriptor: PanelDescriptor = {
      userOpenable: true,
      layouting: "flexible",
      defaultTitle: "Datas",
      defaultIcon: "fa:database",
      defaultDockId: "left",
      parameters: {
         session: true,
         selection: true,
         device: true,
         inspector: true,
      }
   }
   shouldComponentUpdate(nextProps) {
      const { props } = this
      if (nextProps.inspector !== props.inspector) {
         if (props.inspector) props.inspector.removeWatcher(this)
         if (nextProps.inspector) nextProps.inspector.addWatcher(this)
      }
      return true
   }
   componentWillUnmount() {
      const { inspector } = this.props
      if (inspector) {
         inspector.removeWatcher(this)
      }
   }
   onDeviceFramesChange(mat: DeviceInspector) {
      this.forceUpdate()
   }
   onDeviceClose(mat: DeviceInspector) {
      this.setState({ inspector: null })
   }
   onSelectTemplate = (template: ExpressionTemplate) => {
      const { model } = this.props
      const element = template.getExpression()
      if (element) {
         this.feature.selectByElement(element, true)
      }
      else {
         console.error("invalid template select", template)
      }
   }
   onSelectExpr = (element: DXElement) => {
      if (element) {
         this.feature.selectByElement(element, true)
      }
      else {
         console.error("invalid expr select", element)
      }
   }
   onAddOperator = (name: string, desc: AST.Any, layer: DocumentLayer) => {
      const { model } = this.props
      const prev = layer.support
         ? layer.support
         : model.main
      if (prev) {
         throw new Error("TODO")
         /* const path = history.getPathOf(prev)
         history.setAtPath(path, {
            ...prev,
            flow: {
               ...prev.flow,
               [name]: desc,
            }
         })
         this.feature.updateModel() */
      }
   }
   onDisplayConfig = () => {
      this.feature.openPanel("flow/device")
   }
   render() {
      const { model, inspector, selection } = this.props
      if (model) {
         const stack = []
         for (let layer = selection?.scope; layer; layer = layer.layer) {
            stack.push(layer)
         }
         return <div>
            <Stack className="DatasPanel-Item" onClick={this.onDisplayConfig}>
               <Stack.FixedDock><Icon name="code:action/display" /></Stack.FixedDock>
               <Stack.FlexDock>{<b>device</b>}</Stack.FlexDock>
            </Stack>
            <ModelView inspector={inspector?.acquireModelInspector(model.id)}>
               {(imodel) => {
                  return <>
                     {/* <pre>{imodel && JSON.stringify(imodel.contexts, null, 2)}</pre> */}
                     {stack.reverse().map((flow, i) => <DataLayerNode
                        key={i}
                        selection={selection}
                        layer={flow}
                        imodel={imodel}
                        onSelectTemplate={this.onSelectTemplate}
                        onSelectExpr={this.onSelectExpr}
                        onAddOperator={this.onAddOperator}
                     />)}
                  </>
               }}
            </ModelView>
         </div>
      }
      else {
         return <>{"No model"}</>
      }
   }
}
