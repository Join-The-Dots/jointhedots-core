import React from 'react'
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

export class Button extends React.Component<ButtonProps> {
   static defaultProps = defaultProps;

   getClassName = (): string => {
      const isIcon = this.props.variant === 'icon'

      let { iconVariant } = this.props
      const iconMore = iconVariant === 'more'
      const iconBorder = iconVariant === 'border'
      const iconGlobalHeader = iconVariant === 'global-header'

      const showButtonVariant =
         (this.props.variant !== 'base' &&
            !iconVariant &&
            !this.props.inverse &&
            this.props.variant !== 'link') ||
         iconVariant === 'bare'
      const plainInverseBtn = this.props.inverse && !isIcon
      const plainInverseIcon =
         this.props.inverse && isIcon && !iconMore && !iconBorder
      const moreInverseIcon = this.props.inverse && iconMore
      const borderInverseIcon = this.props.inverse && iconBorder

      // After hijacking `iconVariant` to let `Button` know it's in the header, we reset to container style for the actual button CSS.
      if (iconVariant === 'global-header') {
         iconVariant = 'container'
      }

      return classNames(
         {
            'slds-button': this.props.variant !== 'link',
            [`slds-button_${this.props.variant}`]: showButtonVariant,
            'slds-button_inverse': plainInverseBtn,
            'slds-button_icon-inverse': plainInverseIcon || moreInverseIcon,
            'slds-button_icon-border-inverse': borderInverseIcon,
            [`slds-button_icon-${iconVariant}`]: iconVariant && !borderInverseIcon,
            'slds-global-header__button_icon': iconGlobalHeader,
            // If icon has a container, then we apply the icon size to the container not the svg. Icon size is medium by default, so we don't need to explicitly render it here.
            [`slds-button_icon-${this.props.iconSize}`]:
               iconVariant && this.props.iconSize !== 'md',
            'slds-button_reset': this.props.variant === 'link',
            'slds-text-link': this.props.variant === 'link',
         },
         this.props.className
      )
   };

   handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
      if (this.props.onClick) {
         this.props.onClick(event, {})
      }
   };

   renderIcon = (name: string): React.ReactNode => {
      const iconSize =
         !this.props.iconSize || this.props.iconVariant
            ? null
            : this.props.iconSize
      return (
         <Icon
            className='slds-button__icon'
            name={this.props.icon} // BREAKING CHANGE we will introduce in 1.0. For the moment, set default prop here if none specified.
            inverse={this.props.inverse}
            size={iconSize}
            style={{ marginRight: 5, marginLeft: 5 }}
         />
      )
   };

   renderLabel = (): React.ReactNode => {
      const iconOnly = this.props.icon
      const assistiveTextIcon = this.props.assistiveText
      return iconOnly && assistiveTextIcon ? (
         <span className="slds-assistive-text">{assistiveTextIcon}</span>
      ) : (
         this.props.label
      )
   };

   renderButton = (): React.ReactElement => {
      return (
         // eslint-disable-next-line react/button-has-type
         <button
            className={this.getClassName()}
            disabled={this.props.disabled}
            id={this.props.id}
            onBlur={this.props.onBlur}
            onClick={this.handleClick}
            onFocus={this.props.onFocus}
            onKeyDown={this.props.onKeyDown}
            onKeyPress={this.props.onKeyPress}
            onKeyUp={this.props.onKeyUp}
            onMouseDown={this.props.onMouseDown}
            onMouseEnter={this.props.onMouseEnter}
            onMouseLeave={this.props.onMouseLeave}
            onMouseUp={this.props.onMouseUp}
            ref={(component) => {
               if (this.props.buttonRef) {
                  this.props.buttonRef(component)
               }
               if (
                  component &&
                  this.props.requestFocus &&
                  this.props.onRequestFocus
               ) {
                  this.props.onRequestFocus(component)
               }
            }}
            title={this.props.title}
            // eslint-disable-next-line react/button-has-type
            type={this.props.type || 'button'}
            style={this.props.style}
            {...getHtmlProps(this.props)}
         >
            {this.props.iconPosition === 'right' ? this.renderLabel() : null}

            {this.props.icon
               ? this.renderIcon(this.props.icon || '')
               : null}

            {this.props.iconPosition === 'left' || !this.props.iconPosition
               ? this.renderLabel()
               : null}
            {this.props.children}
         </button>
      )
   };

   // This is present for backwards compatibility and should be removed at a future breaking change release. Please wrap a `Button` in a `PopoverTooltip` to achieve the same result. There will be an extra trigger `div` wrapping the `Button` though.
   renderTooltip = (): React.ReactElement => (
      <Tooltip content={this.props.tooltip}>{this.renderButton}</Tooltip>
   );

   render(): React.ReactElement {
      return this.props.tooltip ? this.renderTooltip() : this.renderButton()
   }
}

export function ButtonIcon(props: {
   icon: string
   size?: IconSize | string
   title?: string
   inversed?: boolean
   variant?: "primary" | "secondary" | "watermark"
   className?: string
   style?: React.CSSProperties
   onClick?: React.MouseEventHandler
}) {
   const { icon, size, inversed, variant, className, style, ...others } = props
   const baseClass = variant ? IconButtonClassname + variant : IconButtonClassname
   const buttonClass = className ? baseClass + className : baseClass
   const buttonStyle = size ? { ...style, fontSize: size && (IconSize[size] || size) } : style
   return <div {...others} className={buttonClass} style={buttonStyle}>
      <Icon name={icon} inverse={inversed} />
   </div>
}
