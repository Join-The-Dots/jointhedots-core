import React, { Component } from "react"
import ReactDOM from 'react-dom'

class ExpandPortal extends Component {
  props: {
    parent: ExpandedZone
  }
  shouldComponentUpdate() {
    return false
  }
  render() {
    const { parent } = this.props
    return parent && parent.props.children
  }
}

export default class ExpandedZone extends React.Component {
  props: {
    onExpand: (content) => void
    children: React.ReactNode
  }
  portal: ExpandPortal
  constructor(props) {
    super(props)
    props.onExpand(<ExpandPortal
      ref={this.handleRef}
      parent={this}
    />)
  }
  componentWillUnmount() {
    this.props.onExpand?.(null)
  }
  componentDidMount() {
    this.portal?.forceUpdate()
  }
  componentDidUpdate() {
    this.portal?.forceUpdate()
  }
  handleRef = (portal) => {
    portal?.forceUpdate()
    this.portal = portal
  }
  render() {
    const { onExpand, children } = this.props
    if (onExpand) return null
    else return children
  }
}
