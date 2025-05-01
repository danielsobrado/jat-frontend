import React from 'react';

/**
 * Type definition for icon components, explicitly including both SVG components and Ant Design icons
 */
export type SvgComponent = 
  | React.ComponentType<React.SVGProps<SVGSVGElement>> 
  | React.ForwardRefExoticComponent<any>;

/**
 * Interface for sidebar menu items
 */
export interface LeftSidebarItem {
  key: string;
  isBeta?: boolean;
  title: string;
  redirect_url?: string;
  icon: SvgComponent;
  dataTestId: string;
  disableExpandIcon?: boolean;
  children?: Array<LeftSidebarItem>;
  onClick?: () => void;
  requiredPermission?: string; // Permission code required to see this item
}

/**
 * Interface for the LeftSidebar component props
 */
export interface LeftSidebarProps {
  isSidebarCollapsed?: boolean;
  onLogout?: () => void;
  ragEnabled?: boolean; // Added for conditional RAG items
}