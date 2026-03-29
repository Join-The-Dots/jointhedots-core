import React, { useState } from 'react'
import classNames from 'classnames'
import { Tooltip } from '@salesforce/design-system-react'
import { getHtmlProps } from './getProps'
import { Icon, IconSize } from "../Icon"
import '@salesforce-ux/design-system/assets/styles/salesforce-lightning-design-system.min.css'
import "./Button.scss"

const IconButtonClassname = "jtd-button-icon "

interface ButtonProps {
   assistiveText?: string
   className?: string | object | any[]
   disabled?: boolean
   hint?: boolean
   icon?: string
   iconPosition?: 'left' | 'right'
   iconSize?: 'xs' | 'sm' | 'md' | 'lg'
   iconVariant?: 'bare' | 'container' | 'border' | 'border-filled' | 'brand' | 'more' | 'global-header'
   id?: string
   inverse?: boolean
   label?: string | React.ReactNode
   onBlur?: (event: React.FocusEvent<HTMLButtonElement>) => void
   onClick?: (event: React.MouseEvent<HTMLButtonElement>, data: {}) => void
   onFocus?: (event: React.FocusEvent<HTMLButtonElement>) => void
   onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void
   onKeyPress?: (event: React.KeyboardEvent<HTMLButtonElement>) => void
   onKeyUp?: (event: React.KeyboardEvent<HTMLButtonElement>) => void
   onMouseDown?: (event: React.MouseEvent<HTMLButtonElement>) => void
   onMouseEnter?: (event: React.MouseEvent<HTMLButtonElement>) => void
   onMouseLeave?: (event: React.MouseEvent<HTMLButtonElement>) => void
   onMouseUp?: (event: React.MouseEvent<HTMLButtonElement>) => void
   onRequestFocus?: (component: HTMLButtonElement) => void
   buttonRef?: (component: HTMLButtonElement | null) => void
   requestFocus?: boolean
   responsive?: boolean
   tabIndex?: string
   type?: 'reset' | 'submit' | 'button'
   title?: string
   tooltip?: React.ReactNode
   variant?: 'base' | 'link' | 'neutral' | 'brand' | 'outline-brand' | 'destructive' | 'success' | 'text-destructive' | 'icon'
   style?: React.CSSProperties
   children?: React.ReactNode
}

const defaultProps: Partial<ButtonProps> = {
   disabled: false,
   hint: false,
   iconSize: 'md',
   responsive: false,
   type: 'button',
   variant: 'neutral',
}

export function Button(inProps: ButtonProps) {
   const props = { ...defaultProps, ...inProps }

   const getClassName = (): string => {
      const isIcon = props.variant === 'icon'

      let { iconVariant } = props
      const iconMore = iconVariant === 'more'
      const iconBorder = iconVariant === 'border'
      const iconGlobalHeader = iconVariant === 'global-header'

      const showButtonVariant =
         (props.variant !== 'base' &&
            !iconVariant &&
            !props.inverse &&
            props.variant !== 'link') ||
         iconVariant === 'bare'
      const plainInverseBtn = props.inverse && !isIcon
      const plainInverseIcon =
         props.inverse && isIcon && !iconMore && !iconBorder
      const moreInverseIcon = props.inverse && iconMore
      const borderInverseIcon = props.inverse && iconBorder

      // After hijacking `iconVariant` to let `Button` know it's in the header, we reset to container style for the actual button CSS.
      if (iconVariant === 'global-header') {
         iconVariant = 'container'
      }

      return classNames(
         {
            'slds-button': props.variant !== 'link',
            [`slds-button_${props.variant}`]: showButtonVariant,
            'slds-button_inverse': plainInverseBtn,
            'slds-button_icon-inverse': plainInverseIcon || moreInverseIcon,
            'slds-button_icon-border-inverse': borderInverseIcon,
            [`slds-button_icon-${iconVariant}`]: iconVariant && !borderInverseIcon,
            'slds-global-header__button_icon': iconGlobalHeader,
            // If icon has a container, then we apply the icon size to the container not the svg. Icon size is medium by default, so we don't need to explicitly render it here.
            [`slds-button_icon-${props.iconSize}`]:
               iconVariant && props.iconSize !== 'md',
            'slds-button_reset': props.variant === 'link',
            'slds-text-link': props.variant === 'link',
         },
         props.className
      )
   }

   const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
      if (props.onClick) {
         props.onClick(event, {})
      }
   }

   const renderIcon = (name: string): React.ReactNode => {
      const iconSize =
         !props.iconSize || props.iconVariant
            ? null
            : props.iconSize
      return (
         <Icon
            className='slds-button__icon'
            name={props.icon}
            inverse={props.inverse}
            size={iconSize}
            style={{ marginRight: 5, marginLeft: 5 }}
         />
      )
   }

   const renderLabel = (): React.ReactNode => {
      const iconOnly = props.icon
      const assistiveTextIcon = props.assistiveText
      return iconOnly && assistiveTextIcon ? (
         <span className="slds-assistive-text">{assistiveTextIcon}</span>
      ) : (
         props.label
      )
   }

   const renderButton = (): React.ReactElement => {
      return (
         <button
            className={getClassName()}
            disabled={props.disabled}
            id={props.id}
            onBlur={props.onBlur}
            onClick={handleClick}
            onFocus={props.onFocus}
            onKeyDown={props.onKeyDown}
            onKeyPress={props.onKeyPress}
            onKeyUp={props.onKeyUp}
            onMouseDown={props.onMouseDown}
            onMouseEnter={props.onMouseEnter}
            onMouseLeave={props.onMouseLeave}
            onMouseUp={props.onMouseUp}
            ref={(component) => {
               if (props.buttonRef) {
                  props.buttonRef(component)
               }
               if (component && props.requestFocus && props.onRequestFocus) {
                  props.onRequestFocus(component)
               }
            }}
            title={props.title}
            type={props.type || 'button'}
            style={props.style}
            {...getHtmlProps(props)}
         >
            {props.iconPosition === 'right' ? renderLabel() : null}
            {props.icon ? renderIcon(props.icon || '') : null}
            {props.iconPosition === 'left' || !props.iconPosition
               ? renderLabel()
               : null}
            {props.children}
         </button>
      )
   }

   if (props.tooltip) {
      return <Tooltip content={props.tooltip}>{renderButton}</Tooltip>
   }
   return renderButton()
}

export type ButtonIconProps = {
   icon: string
   hoveredIcon?: string
   size?: IconSize | string
   title?: string
   inversed?: boolean
   variant?: "primary" | "secondary" | "watermark"
   className?: string
   style?: React.CSSProperties
   onClick?: React.MouseEventHandler
}

export function ButtonIcon(props: ButtonIconProps) {
   const { icon, hoveredIcon, size, inversed, variant, className, style, ...others } = props
   const baseClass = variant ? IconButtonClassname + variant : IconButtonClassname
   const buttonClass = className ? baseClass + className : baseClass
   const buttonStyle = size ? { ...style, fontSize: size && (IconSize[size] || size) } : style
   if (hoveredIcon) {
      const [hovered, setHovered] = useState(false)
      return <div {...others} className={buttonClass} style={buttonStyle} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
         <Icon name={hovered ? hoveredIcon : icon} inverse={inversed} />
      </div>
   }
   return <div {...others} className={buttonClass} style={buttonStyle}>
      <Icon name={icon} inverse={inversed} />
   </div>
}
