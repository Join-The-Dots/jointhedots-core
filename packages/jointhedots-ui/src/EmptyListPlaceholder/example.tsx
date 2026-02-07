import React from "react";
import EmptyListPlaceholder from "./index";

/**
 * Example usage of the EmptyListPlaceholder component
 */
export const EmptyListPlaceholderExamples: React.FC = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Basic usage with just a message */}
      <div>
        <h3>Basic Usage</h3>
        <EmptyListPlaceholder message="No items found in this list." />
      </div>

      {/* With custom icon */}
      <div>
        <h3>Custom Icon</h3>
        <EmptyListPlaceholder 
          message="Your inbox is empty." 
          icon="bi:envelope" 
        />
      </div>

      {/* With custom styling */}
      <div>
        <h3>Custom Styling</h3>
        <EmptyListPlaceholder 
          message="No notifications to display." 
          icon="bi:bell" 
          className="custom-empty-state"
          style={{ backgroundColor: "rgba(0, 123, 255, 0.05)" }}
        />
      </div>

      {/* Without icon */}
      <div>
        <h3>Without Icon</h3>
        <EmptyListPlaceholder 
          message="No results match your search criteria." 
          icon="" 
        />
      </div>
    </div>
  );
};

export default EmptyListPlaceholderExamples;
