// src/components/Sidebar/LeftSidebar.component.tsx
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Button, Col, Menu, MenuProps, Modal, Row, Typography } from 'antd';
import classNames from 'classnames';
import { noop } from 'lodash';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // Import useAuth hook

// Import constants and types
import {
  SIDEBAR_ITEMS as BASE_SIDEBAR_ITEMS,
  BOTTOM_SIDEBAR_ITEMS,
  SIDEBAR_NESTED_KEYS,
  RAG_INFO_SIDEBAR_ITEM,
  CHAT_SIDEBAR_ITEM,
  ADMIN_SIDEBAR_ITEMS,
  LANGGRAPH_VIS_SIDEBAR_ITEM, // Import LangGraph item
  SNOW_SIDEBAR_ITEM, // Import SNOW sidebar item
} from '../../constants/LeftSidebar.constants';
import { SidebarItem as SidebarItemEnum } from '../../enum/sidebar.enum';
import { LeftSidebarItem as LeftSidebarItemType, LeftSidebarProps } from './LeftSidebar.interface';
import LeftSidebarItem from './LeftSidebarItem.component';
import './left-sidebar.css';

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  isSidebarCollapsed = true,
  onLogout = () => {},
  ragEnabled = false // Default to false and let the prop override it
}) => {
  const location = useLocation();
  const { authEnabled, checkPermission } = useAuth(); // Get auth state and check function
  const [showConfirmLogoutModal, setShowConfirmLogoutModal] = useState(false);
  
  // Add debug useEffect
  useEffect(() => {
    console.log('LeftSidebar - ragEnabled:', ragEnabled);
  }, [ragEnabled]);

  const selectedKeys = useMemo(() => {
    const pathname = location.pathname;
    const matchedParent = Object.keys(SIDEBAR_NESTED_KEYS).find(key => pathname.startsWith(key));
    const parentKey = matchedParent ? SIDEBAR_NESTED_KEYS[matchedParent] : null;
    if (parentKey) return [parentKey];
    const directMatch = pathname.split('/').slice(0, 2).join('/');
    return [directMatch];
  }, [location.pathname]);

  const handleLogoutClick = useCallback(() => { setShowConfirmLogoutModal(true); }, []);
  const hideConfirmationModal = () => { setShowConfirmLogoutModal(false); };
  const handleLogout = useCallback(() => { onLogout(); setShowConfirmLogoutModal(false); }, [onLogout]);

  // Filter menu items based on permissions
  const filterItemsByPermission = useCallback((items: LeftSidebarItemType[]): MenuProps['items'] => {
    return items
      .filter(item => !authEnabled || !item.requiredPermission || checkPermission(item.requiredPermission)) // Filter top-level
      .map(item => ({
        key: item.key,
        label: <LeftSidebarItem data={item} />,
        icon: item.icon ? React.createElement(item.icon) : undefined,
        // Recursively filter children if needed
        children: item.children
          ?.filter(child => !authEnabled || !child.requiredPermission || checkPermission(child.requiredPermission))
          .map((childItem: LeftSidebarItemType) => ({
            key: childItem.key,
            label: <LeftSidebarItem data={childItem} />,
            icon: childItem.icon ? React.createElement(childItem.icon) : undefined,
          })),
      }));
  }, [authEnabled, checkPermission]);

  // Map menu items with conditional RAG and Admin items
  const topMenuItems: MenuProps['items'] = useMemo(() => {
    let items: LeftSidebarItemType[] = [...BASE_SIDEBAR_ITEMS]; // Start with base items from constants

    // Determine the insertion index for Chat and RAG
    const historyIndex = items.findIndex(item => item?.key === SidebarItemEnum.HISTORY);
    let insertionPoint = historyIndex !== -1 ? historyIndex + 1 : items.length;

    // Insert Chat Item
    items.splice(insertionPoint, 0, CHAT_SIDEBAR_ITEM);
    insertionPoint++; // Move insertion point for next item

    // Insert RAG item if enabled
    if (ragEnabled === true) {
      console.log("RAG is enabled, adding RAG menu item");
      items.splice(insertionPoint, 0, RAG_INFO_SIDEBAR_ITEM);
      insertionPoint++; // Move insertion point for next item
    } else {
      console.log("RAG is not enabled, not adding RAG menu item");
    }

    // Insert LangGraph item
    items.splice(insertionPoint, 0, LANGGRAPH_VIS_SIDEBAR_ITEM);
    insertionPoint++; // Move insertion point for next item
    
    // Insert ServiceNow (SNOW) item
    items.splice(insertionPoint, 0, SNOW_SIDEBAR_ITEM);
    // insertionPoint++; // Not needed if SNOW is the last dynamic item before admin items

    // Add Admin items (conditionally displayed based on permissions in the filter below)
    items = [...items, ...ADMIN_SIDEBAR_ITEMS];

    // Filter based on permissions
    return filterItemsByPermission(items);
  }, [ragEnabled, filterItemsByPermission]);

  const bottomMenuItems: MenuProps['items'] = useMemo(
    () => filterItemsByPermission(BOTTOM_SIDEBAR_ITEMS.map(item => ({
      ...item,
      onClick: item.key === SidebarItemEnum.LOGOUT ? handleLogoutClick : item.onClick || noop,
    }))),
    [handleLogoutClick, filterItemsByPermission]
  );

  return (
    <div
      className={classNames(
        'flex flex-col justify-between h-full left-sidebar-container',
        { 'sidebar-open': !isSidebarCollapsed }
      )}
      data-testid="left-sidebar"
    >
      <Row>
        <Col className="w-full">
          <Menu
            items={topMenuItems}
            mode="inline"
            theme="light"
            inlineCollapsed={isSidebarCollapsed}
            className="left-sidebar-menu"
            selectedKeys={selectedKeys}
            style={{ border: 'none' }}
          />
        </Col>
      </Row>

      <Row className="py-2">
        <Col span={24}>
          <Menu
            items={bottomMenuItems}
            mode="inline"
            theme="light"
            inlineCollapsed={isSidebarCollapsed}
            className="left-sidebar-menu"
            selectable={false}
            style={{ border: 'none' }}
          />
        </Col>
      </Row>

      {showConfirmLogoutModal && (
        <Modal
          centered
          title="Logout Confirmation"
          open={showConfirmLogoutModal}
          onCancel={hideConfirmationModal}
          footer={[
            <Button key="cancel" onClick={hideConfirmationModal}>
              Cancel
            </Button>,
            <Button key="logout" type="primary" danger onClick={handleLogout} data-testid="confirm-logout">
              Logout
            </Button>,
          ]}
        >
          <Typography.Text>Are you sure you want to log out?</Typography.Text>
        </Modal>
      )}
    </div>
  );
};

export default LeftSidebar;