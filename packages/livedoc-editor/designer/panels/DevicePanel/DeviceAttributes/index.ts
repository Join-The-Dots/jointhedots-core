import { DeviceRemote } from "@livedoc/core/remote"
import { MapLike } from "@livedoc/core"

export type AttributEditorProps<T = any> = {
   device: DeviceRemote
   content: T
   onChange: (content: T) => void
}

export type AttributEditorDesc = {
   norm: string
   editor: React.ComponentType<AttributEditorProps>
}

export const AttributeEditors: MapLike<AttributEditorDesc> = {}

export function registerAttributeEditor(desc: AttributEditorDesc) {
   AttributeEditors[desc.norm] = desc
}
