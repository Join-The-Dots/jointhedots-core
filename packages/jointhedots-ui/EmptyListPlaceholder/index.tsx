import React from "react";
import { Icon } from "../Icon";
import "./style.scss";

export interface EmptyListPlaceholderProps {
  /**
   * The message to display when the list is empty
   */
  message: string;
  
  /**
   * Optional icon name to display above the message
   * Uses the Icon component from the project
   */
  icon?: string;
  
  /**
   * Optional additional className for styling
   */
  className?: string;
  
  /**
   * Optional additional inline styles
   */
  style?: React.CSSProperties;
}

/**
 * EmptyListPlaceholder component
 * 
 * A reusable component to display a placeholder when a list is empty.
 * It shows a message and optionally an icon.
 */
export const EmptyListPlaceholder: React.FC<EmptyListPlaceholderProps> = ({
  message,
  icon = "bi:inbox",
  className = "",
  style = {},
}) => {
  return (
    <div className={`empty-list-placeholder ${className}`} style={style}>
      {icon && (
        <div className="empty-list-placeholder-icon">
          <Icon name={icon} size="2em" />
        </div>
      )}
      <div className="empty-list-placeholder-message">{message}</div>
    </div>
  );
};

export default EmptyListPlaceholder;
