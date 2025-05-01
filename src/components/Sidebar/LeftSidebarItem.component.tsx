// src/components/Sidebar/LeftSidebarItem.component.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Badge } from 'antd';
import { LeftSidebarItem as LeftSidebarItemType } from './LeftSidebar.interface';

interface LeftSidebarItemProps {
  data: LeftSidebarItemType;
}

const LeftSidebarItem: React.FC<LeftSidebarItemProps> = ({
  data: { title, redirect_url, dataTestId, icon: Icon, isBeta, onClick },
}) => {

  // Label and optional badge content
  const labelContent = (
    <>
      {/* This span's visibility/opacity is controlled by CSS */}
      <span className="left-panel-label">{title}</span>
      {isBeta && (
        <Badge
          className="service-beta-tag ml-1" // Add small margin if needed
          count="Beta"
          size="small"
        />
      )}
    </>
  );

  // The icon is now rendered by the parent Antd Menu.
  // This component only provides the content for the 'label' prop.
  // We render either a NavLink or a button *containing* the label content.

  return redirect_url ? (
    <NavLink
      className={({ isActive }) =>
        // Link itself shouldn't need complex flex styles now
        `left-panel-item-link block w-full ${isActive ? 'active' : ''}`
      }
      data-testid={dataTestId}
      to={redirect_url}
      title={title} // Add title attribute for accessibility on hover
    >
      {labelContent}
    </NavLink>
  ) : (
    <button
      className="left-panel-item-button block w-full text-left bg-transparent border-none cursor-pointer p-0"
      data-testid={dataTestId}
      type="button"
      onClick={onClick}
      title={title} // Add title attribute for accessibility on hover
    >
      {labelContent}
    </button>
  );
};

export default LeftSidebarItem;