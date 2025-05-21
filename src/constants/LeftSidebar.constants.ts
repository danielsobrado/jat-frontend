// src/constants/LeftSidebar.constants.ts
import {
  HomeOutlined,         // Test
  FileTextOutlined,     // Batch
  AppstoreOutlined,     // Batch Jobs (or use something else)
  HistoryOutlined,      // History
  MessageOutlined,      // Chat (Ant Design)
  DatabaseOutlined,     // RAG Info
  ShareAltOutlined,     // LangGraph (or BulbOutlined, PlayCircleOutlined, ApartmentOutlined)
  UserOutlined,         // Admin Users
  TeamOutlined,         // Admin Roles (or SafetyCertificateOutlined)
  SettingOutlined,      // Settings
  LogoutOutlined,       // Logout
  PlusOutlined,         // Needed for sub-items like "Create Graph"
  // UnorderedListOutlined, // Example for sub-item, if needed
} from '@ant-design/icons';
import { LeftSidebarItem } from '../components/Sidebar/LeftSidebar.interface';
import { SidebarItem as SidebarItemEnum } from '../enum/sidebar.enum';

export const SIDEBAR_NESTED_KEYS: Record<string, string> = {
  '/batch/jobs': SidebarItemEnum.BATCH,
  // If you have /view/:id, /create, etc., and want the main LangGraph item to stay highlighted:
  [SidebarItemEnum.LANGGRAPH_VIEW]: SidebarItemEnum.LANGGRAPH_LIST,
  [SidebarItemEnum.LANGGRAPH_CREATE]: SidebarItemEnum.LANGGRAPH_LIST,
  [SidebarItemEnum.LANGGRAPH_EDIT]: SidebarItemEnum.LANGGRAPH_LIST, // If you add edit
  // Add your existing nested keys for admin, history etc.
  '/admin/users/edit': SidebarItemEnum.ADMIN_USERS, // Assuming you might have edit sub-routes
  '/admin/roles/edit': SidebarItemEnum.ADMIN_ROLES,
  '/history/details': SidebarItemEnum.HISTORY, // Added from previous context
};

// Base items before dynamic insertions
export const SIDEBAR_ITEMS: LeftSidebarItem[] = [
  {
    key: SidebarItemEnum.TEST,
    title: 'Test',
    icon: HomeOutlined,
    dataTestId: 'test-sidebar-item', // Changed dataTestId for clarity
    redirect_url: SidebarItemEnum.TEST,
    requiredPermission: 'classify:item', // Example permission
  },
  {
    key: SidebarItemEnum.BATCH,
    title: 'Batch',
    icon: FileTextOutlined,
    dataTestId: 'batch-sidebar-item',
    redirect_url: SidebarItemEnum.BATCH,
    requiredPermission: 'classify:batch',
    // disableExpandIcon: true, // Remove if children are present and you want auto-expand icon
    children: [
      {
        key: SidebarItemEnum.BATCH_JOBS,
        title: 'Batch Jobs',
        icon: AppstoreOutlined,
        dataTestId: 'batch-jobs-sidebar-item',
        redirect_url: SidebarItemEnum.BATCH_JOBS,
        requiredPermission: 'classify:batch', // Same as parent or more specific
      },
    ],
  },
  {
    key: SidebarItemEnum.HISTORY,
    title: 'History',
    icon: HistoryOutlined,
    dataTestId: 'history-sidebar-item',
    redirect_url: SidebarItemEnum.HISTORY,
    requiredPermission: 'history:view',
  },
  // CHAT_SIDEBAR_ITEM, RAG_INFO_SIDEBAR_ITEM, LANGGRAPH_VIS_SIDEBAR_ITEM will be inserted dynamically
];

// Define items to be dynamically inserted
export const CHAT_SIDEBAR_ITEM: LeftSidebarItem = {
    key: SidebarItemEnum.CHAT,
    title: 'Chat',
    icon: MessageOutlined,
    dataTestId: 'chat-sidebar-item',
    redirect_url: SidebarItemEnum.CHAT,
    requiredPermission: 'chat:use', // Example permission
};

export const RAG_INFO_SIDEBAR_ITEM: LeftSidebarItem = {
    key: SidebarItemEnum.RAG_INFO,
    title: 'Information ', 
    icon: DatabaseOutlined,
    dataTestId: 'rag-info-sidebar-item',
    redirect_url: SidebarItemEnum.RAG_INFO,
    requiredPermission: 'rag:view',
};

export const LANGGRAPH_VIS_SIDEBAR_ITEM: LeftSidebarItem = {
    key: SidebarItemEnum.LANGGRAPH_LIST,
    title: 'Workflows', 
    icon: ShareAltOutlined, // Example icon, choose one you like
    dataTestId: 'langgraph-sidebar-item',
    redirect_url: SidebarItemEnum.LANGGRAPH_LIST,
    requiredPermission: 'langgraph:view', // Example permission
    // If you want sub-menu items like "Create New" or "View X":
    children: [
      // {
      //   key: SidebarItemEnum.LANGGRAPH_LIST, // Would be redundant if parent links here
      //   title: 'View Graphs',
      //   icon: UnorderedListOutlined, // Example
      //   dataTestId: 'view-graphs-item',
      //   redirect_url: SidebarItemEnum.LANGGRAPH_LIST,
      // },
      {
        key: SidebarItemEnum.LANGGRAPH_CREATE,
        title: 'Create Graph',
        icon: PlusOutlined,
        dataTestId: 'create-graph-item',
        redirect_url: SidebarItemEnum.LANGGRAPH_CREATE,
        requiredPermission: 'langgraph:create',
      },
    ]
};

export const ADMIN_SIDEBAR_ITEMS: LeftSidebarItem[] = [
    {
        key: SidebarItemEnum.ADMIN_USERS,
        title: 'Users',
        icon: UserOutlined,
        dataTestId: 'admin-users-sidebar-item',
        redirect_url: SidebarItemEnum.ADMIN_USERS,
        requiredPermission: 'users:view', // Or users:manage if view is tied to manage
    },
    {
        key: SidebarItemEnum.ADMIN_ROLES,
        title: 'Roles',
        icon: TeamOutlined,
        dataTestId: 'admin-roles-sidebar-item',
        redirect_url: SidebarItemEnum.ADMIN_ROLES,
        requiredPermission: 'roles:view', // Or roles:manage
    },
];

// Bottom items remain the same
export const SETTING_ITEM: LeftSidebarItem = {
  key: SidebarItemEnum.SETTINGS,
  title: 'Settings',
  redirect_url: SidebarItemEnum.SETTINGS,
  icon: SettingOutlined,
  dataTestId: 'settings-sidebar-item',
  requiredPermission: 'config:view',
};

export const LOGOUT_ITEM: LeftSidebarItem = {
  key: SidebarItemEnum.LOGOUT,
  title: 'Logout',
  icon: LogoutOutlined,
  dataTestId: 'logout-sidebar-item',
  // No redirect_url, onClick is handled in LeftSidebar.component.tsx
};

export const BOTTOM_SIDEBAR_ITEMS: LeftSidebarItem[] = [SETTING_ITEM, LOGOUT_ITEM];