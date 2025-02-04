import React from "react"
import Button from "react-bootstrap/Button"
import "bootstrap/dist/css/bootstrap.min.css"

export default function (props) {
  const send_props = {}

  for (const key in props) {
    if (key.startsWith("on") && props[key] instanceof Function) {
      // remove event
    } else {
      send_props[key] = props[key]
    }
  }

  return <Button {...send_props} onClick={() => alert("Button")}>Click Me</Button>
}
