import { Icon, IconSize } from "./Icon"

const IconButtonClassname = "jtd-icon-button "

export function IconButton(props: {
   name: string
   size?: IconSize | string
   inversed?: boolean
   title?: string
   className?: string
   style?: React.CSSProperties
   onClick?: React.MouseEventHandler
}) {
   const { name, size, inversed, className, style, ...others } = props
   const buttonClass = className ? IconButtonClassname + className : IconButtonClassname
   const buttonStyle = size ? { ...style, fontSize: size && (IconSize[size] || size) } : style
   return <div {...others} className={buttonClass} style={buttonStyle}>
      <Icon name={name} inversed={inversed} />
   </div>
}
