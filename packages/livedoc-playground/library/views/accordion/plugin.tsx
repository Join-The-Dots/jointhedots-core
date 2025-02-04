import React from "react"
import { Accordion, Card, useAccordionButton } from "react-bootstrap"
import "bootstrap/dist/css/bootstrap.min.css"
import { MapLike } from "@livedoc/core"

export type PanelProps = {
  title?: string
  summary?: string
  children?: React.ReactNode
}

export type Props = {
  panels: MapLike<PanelProps>
}

function CustomToggle({ eventKey, callback, children }: any) {
  const decoratedOnClick = useAccordionButton(eventKey, callback)
  return (
    <div onClick={decoratedOnClick} style={{ cursor: "pointer" }}>
      {children}
    </div>
  )
}

export function AccordionEditable(props: Props) {
  const { panels } = props
  const [activeKey, setActiveKey] = React.useState<string | null>(null)

  return (
    <Accordion activeKey={activeKey} onSelect={(key) => setActiveKey(key as string)}>
      {panels
        ? Object.keys(panels).map((key) => {
          const { title, summary, children } = panels[key]
          return (
            <Card key={key}>
              <Card.Header>
                <CustomToggle eventKey={key} callback={() => setActiveKey(activeKey === key ? null : key)}>
                  <strong>{title || "Untitled"}</strong>
                </CustomToggle>
              </Card.Header>
              <Accordion.Collapse eventKey={key}>
                <Card.Body>
                  <div>{summary && <p>{summary}</p>}</div>
                  <div>{children || <></>}</div>
                </Card.Body>
              </Accordion.Collapse>
            </Card>
          )
        })
        : []}
    </Accordion>
  )
}

export default {
  component: AccordionEditable,
}
