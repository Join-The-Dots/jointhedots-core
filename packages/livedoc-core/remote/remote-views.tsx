import React from 'react'
import { IStateWatcher, DeviceInspector, StateInspector, IModelWatcher, ModelInspector, IDeviceWatcher, ContextInspector, IContextWatcher } from "@livedoc/core/remote/remote-inspector"
import { FrameNotification } from './cmds/target'

type StateViewProps = {
   inspector: StateInspector
   children: (frames: StateInspector) => React.ReactNode
}

export class StateView extends React.Component<StateViewProps> implements IStateWatcher {
   mounted = false
   constructor(props) {
      super(props)
      const { inspector: state } = this.props
      if (state) state.addWatcher(this)
   }
   UNSAFE_componentWillReceiveProps(nextProps: StateViewProps, nextContext: any): void {
      const { inspector } = this.props
      if (inspector !== nextProps.inspector) {
         if (inspector) inspector.removeWatcher(this)
         if (nextProps.inspector) nextProps.inspector.addWatcher(this)
      }
   }
   onStateChange() {
      if (this.mounted) {
         this.forceUpdate()
      }
   }
   onStateClose() {
   }
   componentDidMount() {
      this.mounted = true
   }
   componentWillUnmount() {
      const { inspector: state } = this.props
      if (state) state.removeWatcher(this)
   }
   render() {
      const { children, inspector: state } = this.props
      return children(state)
   }
}

type ContextViewProps = {
   inspector: ContextInspector
   children: (inspector: ContextInspector) => React.ReactNode
}

export class ContextView extends React.Component<ContextViewProps> implements IContextWatcher {
   mounted = false
   constructor(props) {
      super(props)
      const { inspector } = props
      if (inspector) inspector.addWatcher(this)
   }
   UNSAFE_componentWillReceiveProps(nextProps: Readonly<ContextViewProps>, nextContext: any): void {
      const { inspector } = this.props
      if (inspector !== nextProps.inspector) {
         if (inspector) inspector.removeWatcher(this)
         if (nextProps.inspector) nextProps.inspector.addWatcher(this)
      }
   }
   onContextFramesChange?(target: ContextInspector) {
      if (this.mounted) {
         this.forceUpdate()
      }
   }
   onContextClose(target: ContextInspector) {
   }
   componentDidMount() {
      this.mounted = true
   }
   componentWillUnmount() {
      const { inspector } = this.props
      if (inspector) inspector.removeWatcher(this)
   }
   render() {
      const { children, inspector } = this.props
      return children(inspector)
   }
}

type DeviceViewProps = {
   inspector: DeviceInspector
   children: (frames: FrameNotification) => React.ReactNode
}

export class DeviceView extends React.Component<DeviceViewProps> implements IDeviceWatcher {
   mounted = false
   constructor(props) {
      super(props)
      const { inspector } = props
      if (inspector) inspector.addWatcher(this)
   }
   UNSAFE_componentWillReceiveProps(nextProps: Readonly<DeviceViewProps>, nextContext: any): void {
      const { inspector } = this.props
      if (inspector !== nextProps.inspector) {
         if (inspector) inspector.removeWatcher(this)
         if (nextProps.inspector) nextProps.inspector.addWatcher(this)
      }
   }
   onDeviceFramesChange?(target: DeviceInspector) {
      if (this.mounted) {
         this.forceUpdate()
      }
   }
   onDeviceClose(target: DeviceInspector) {
   }
   componentDidMount() {
      this.mounted = true
   }
   componentWillUnmount() {
      const { inspector } = this.props
      if (inspector) inspector.removeWatcher(this)
   }
   render() {
      const { children, inspector } = this.props
      return children(inspector?.frames)
   }
}

type ModelViewProps = {
   inspector: ModelInspector
   children: (target: ModelInspector) => React.ReactNode
   onModelChange?: (target: ModelInspector) => void
}

export class ModelView extends React.Component<ModelViewProps> implements IModelWatcher {
   mounted = false
   constructor(props) {
      super(props)
      const { inspector } = this.props
      if (inspector) inspector.addWatcher(this)
   }
   UNSAFE_componentWillReceiveProps(nextProps: ModelViewProps, nextContext: any): void {
      const { inspector } = this.props
      if (inspector !== nextProps.inspector) {
         if (inspector) inspector.removeWatcher(this)
         if (nextProps.inspector) nextProps.inspector.addWatcher(this)
      }
   }
   onModelChange(target: ModelInspector) {
      const { onModelChange } = this.props
      if (this.mounted) {
         this.forceUpdate()
      }
      onModelChange?.(target)
   }
   onModelClose() {
   }
   render() {
      const { children, inspector } = this.props
      return children(inspector)
   }
}
