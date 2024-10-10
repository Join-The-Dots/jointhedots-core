import React from 'react'
import Icon from 'components/Icon'
import { DragZone, DropZone, getEventInElementPosition } from 'components/DragAndDrop'
import { IEditorProvider } from 'editors/ui'
import { JSONSchema } from 'core/ast/schema'
import Button from 'components/Button'
import ValueInput from '../InputValue'
import "./index.scss"

export function ArrayRow(props: {
  index: number
  value: any
  typing: JSONSchema
  provider: IEditorProvider
  onChange: (value: any) => void
  onMove: (fromIndex: number, toIndex: number) => void
}) {
  const { typing, value, provider, onChange } = props
  const [expanded, setExpanded] = React.useState(null)
  return <DropZone
    className="GrabItem"
    onDroppable={(data) => {
      return data["text/plain"]?.type === "grab-list"
    }}
    onDragEnter={(evt) => {
      const pos = getEventInElementPosition(evt)
      const upper = pos.y > pos.height / 2
      return upper ? "UpperDrop" : "LowerDrop"
    }}
    onDrop={(data, evt) => {
      if (data["text/plain"]) {
        const pos = getEventInElementPosition(evt)
        const upper = pos.y > pos.height / 2
        let toIndex = props.index
        if (upper) toIndex++
        props.onMove(data["text/plain"].fromIndex, toIndex)
      }
    }}
  >
    <div className="Line">
      <DragZone
        onDragStart={() => {
          return {
            "text/plain": {
              type: "grab-list",
              fromIndex: props.index
            }
          }
        }}
      >
        <Icon name="code:action/gripper" />
      </DragZone>
      <ValueInput
        value={value}
        typing={typing}
        provider={provider}
        onExpand={setExpanded}
        onChange={onChange}
      />
    </div>
    {expanded &&
      <div className="ExpandLine">
        {expanded}
      </div>
    }
  </DropZone>
}

export function ArrayTable(props: {
  items: any[]
  itemTyping: JSONSchema
  documentation?: any
  provider: IEditorProvider
  onChange?: (values: any[]) => void
  onCreate?: (index: number) => any
}) {
  const { items, itemTyping, provider, onCreate, onChange } = props

  const change = React.useCallback((index) => (value) => {
    const new_items = Array.isArray(items) ? [...items] : []
    new_items[index] = value
    onChange?.(new_items)
  }, null)

  function move(fromIndex: number, toIndex: number) {
    const new_items = items.slice()
    if (fromIndex < toIndex) toIndex--
    new_items.splice(fromIndex, 1)
    new_items.splice(toIndex, 0, items[fromIndex])
    onChange?.(new_items)
  }

  function add(atIndex: number) {
    const new_value = onCreate(atIndex)
    const new_items = Array.isArray(items) ? [...items] : []
    if (atIndex < 0) new_items.push(new_value)
    else new_items.splice(atIndex, 0, new_value)
    onChange(new_items)
  }

  return (<div className="InSlick-ArrayTable">
    {Array.isArray(items) && items.map((value, i) => {
      return <ArrayRow
        key={i}
        index={i}
        value={value}
        typing={itemTyping}
        provider={provider}
        onChange={change(i)}
        onMove={move}
      />
    })}
    {onCreate && <div>
      <Button name="bi:plus" secondary onClick={() => add(-1)} />
    </div>}
  </div>)
}
