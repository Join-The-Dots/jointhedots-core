import React from 'react'
import { PanelComponent, PanelDescriptor } from "@livedoc/editor/ui/FeaturesLayout"
import { ViewEditor } from "../../editor"
import { DeviceInspector } from "@livedoc/core/remote"
import Stack from "@livedoc/editor/ui/Stack"
import { DeviceRemote } from '@livedoc/core/remote'
import { DeviceConfigurationEditor } from './DeviceAttributes/views'

export class DevicePanel extends PanelComponent<ViewEditor, {
   device: DeviceRemote
   inspector: DeviceInspector
}> {
   static Descriptor: PanelDescriptor = {
      userOpenable: true,
      layouting: "flexible",
      defaultTitle: "Device",
      defaultIcon: "fa:mobile",
      defaultDockId: "right",
      parameters: {
         device: true,
         inspector: true,
      }
   }
   render() {
      const { device } = this.props
      if (device) {
         return <DeviceConfigurationEditor device={device} />
      }
      else {
         return <>{"No device"}</>
      }
   }
}
