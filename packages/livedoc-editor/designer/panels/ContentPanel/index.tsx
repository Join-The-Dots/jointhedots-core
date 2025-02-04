import React from 'react'
import { PanelComponent, PanelDescriptor } from '@livedoc/editor/ui/FeaturesLayout'
import { ViewEditor } from '../../editor'
import { TargetCmd, TargetApi, DeviceRemote } from '@livedoc/core/remote'
import { DescriptorEditionSelection } from '@livedoc/editor/designer/selection'
import Button from '@livedoc/editor/ui/ButtonIcon'
import { InnerDeviceComponent } from './InnerDevice'
import './index.scss'
import { DocumentModel } from '@livedoc/core'

export type ContentProps = {
   model: DocumentModel
   device: DeviceRemote
   Component: React.ComponentType<any>
   selection: DescriptorEditionSelection
}

export class ContentPanel extends PanelComponent<ViewEditor, ContentProps> {
   static Descriptor: PanelDescriptor = {
      userOpenable: true,
      layouting: "flexible",
      defaultTitle: "Content",
      defaultIcon: "fa:cube",
      defaultDockId: "center",
      keepAlive: true,
      parameters: {
         session: true,
         Component: true,
         selection: true,
      }
   }

   onReload = () => {
      const { device } = this.feature
      if (device) {
         device.reload()
      }
   }
   onDisplaySwitch = () => {
      this.feature.query<TargetApi["DisplaySwitch"]>({
         cmd: TargetCmd.DisplaySwitch
      })
   }
   onDisplayConfig = () => {
      this.feature.openPanel("flow/device")
   }
   onDisplayUnselect = () => {
      this.feature.unselect()
   }
   onDevice = (device: DeviceRemote) => {
      this.feature.unregisterDevice(this.feature.device)
      if (device) {
         this.feature.registerDevice(device)
      }
   }
   render() {
      const { model } = this.props
      return (<div className="InSlick-ContentEditor">
         <div style={{ display: "flex", flexDirection: "row" }}>
            <Button name="code:action/refresh" variant="secondary" onClick={this.onReload} />
            <Button name="code:action/gripper" variant="secondary" onClick={this.onDisplaySwitch} />
            <Button name="code:action/config" variant="secondary" onClick={this.onDisplayConfig} />
            <Button name="code:action/remove" variant="secondary" onClick={this.onDisplayUnselect} />
         </div>
         <InnerDeviceComponent componentId={model.id} onDevice={this.onDevice} />
      </div>)
   }
}
