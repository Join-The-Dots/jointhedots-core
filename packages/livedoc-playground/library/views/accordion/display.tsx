import React from "react"
import Accordion from "react-bootstrap/Accordion"
import { Props } from "./plugin"
import "./display.scss"
import { MapLike } from "typescript"
import { InstrumentationContext } from "@livedoc/ui/instrumentation/InstrumentationZone"

function AccordionAddon(props: any) {
  return props.children
}

function make_unique_key(collection: MapLike<any>) {
  let index = 0
  let key: string = null
  do {
    key = `item_${index++}`
  } while (collection && collection[key] !== undefined)
  return key
}

export default function AccordionEditable(props: Props) {
  let { panels } = props
  const [expanded, setExpanded] = React.useState<string | null>(null)
  const element = React.useContext(InstrumentationContext)

  const onAdd = () => {
    /* const desc = element.getDescriptor()
    const panel_key = make_unique_key(desc?.props?.panels?.fields)
    element.setDescriptor({
      ...desc,
      props: {
        ...desc.props,
        panels: {
          ...desc.props?.panels,
          fields: {
            ...desc.props?.panels?.fields,
            [panel_key]: {
              type: "record",
              fields: {},
            },
          },
        },
      },
    }) */
  }

  return (
    <div className="editable-accordion">
      <Accordion activeKey={expanded}>
        {panels
          ? Object.keys(panels).map((key) => {
            const { title, summary, children } = panels[key]
            return (
              <Accordion.Item key={key} eventKey={key}>
                <Accordion.Header
                  title={title}
                  onClick={() => setExpanded(expanded === key ? null : key)}
                >
                  {summary || ""}
                </Accordion.Header>
                <Accordion.Body>
                  {children}
                </Accordion.Body>
              </Accordion.Item>
            )
          })
          : []}
      </Accordion>
      <AccordionAddon>
        <div className="toolbox" onClick={onAdd} />
      </AccordionAddon>
    </div>
  )
}
