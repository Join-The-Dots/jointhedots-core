import React from 'react'
import { PanelComponent, PanelDescriptor } from '@livedoc/editor/ui/FeaturesLayout'
import { ViewEditor } from '../../editor'
import SplitContainer from '@livedoc/editor/ui/SplitContainer'
import { ContextInspector, IContextWatcher, IDeviceWatcher, DeviceInspector } from '@livedoc/core/remote'
import { FlowViewInspector } from './ContextInspector'
import { FramesInspector } from './FramesInspector'
import { DeviceRemote } from '@livedoc/core/remote'
import { DocumentModel } from '@livedoc/core'
import "./index.scss"

export type PropsType = {
   model: DocumentModel
   device: DeviceRemote
   inspector: DeviceInspector
}

export type StateType = {
   selected?: ContextInspector
   inspector?: DeviceInspector
   layout: any
}

export class InspectorPanel extends PanelComponent<ViewEditor, PropsType, StateType> implements IDeviceWatcher, IContextWatcher {
   static Descriptor: PanelDescriptor = {
      layouting: "flexible",
      defaultTitle: "Inspector",
      defaultIcon: "fa:bug",
      defaultDockId: "right",
      parameters: {
         session: true,
         device: true,
         inspector: true,
      }
   }
   state = {
      selected: null,
      layout: [{ size: 1 }, { size: 1 }]
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
      const { selected } = this.state
      if (selected) {
         selected.removeWatcher(this)
         selected.dispose()
      }
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
   onContextClose(ctx: ContextInspector) {
      const { selected } = this.state
      ctx.dispose()
      if (selected === ctx) {
         this.setState({ selected: null })
      }
   }
   onSelect = async (frameId: number) => {
      const { inspector } = this.props
      const ctx = await inspector.acquireContextInspector(frameId)
      ctx.addWatcher(this)

      const { selected } = this.state
      if (selected) {
         selected.removeWatcher(this)
         selected.dispose()
      }
      this.setState({ selected: ctx })
   }
   refresh = async () => {
      const { inspector } = this.props
      await inspector.refresh()
      this.forceUpdate()
   }
   render() {
      const { inspector } = this.props
      const { selected } = this.state
      return <SplitContainer
         items={[
            {
               size: 1,
               header: "Frames",
               content: inspector && <FramesInspector
                  inspector={inspector}
                  selected={selected}
                  onRefresh={this.refresh}
                  onSelect={this.onSelect}
               />,
            }, {
               size: 1,
               header: "Selected Frame",
               content: (inspector && selected)
                  ? <FlowViewInspector editor={this.feature} icontext={selected} />
                  : <div>{"No frame"}</div>,
            }
         ]}
      />
   }
}
