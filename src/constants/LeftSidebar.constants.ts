// src/constants/LeftSidebar.constants.ts
import {
  HomeOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  HistoryOutlined,
  SettingOutlined,
  LogoutOutlined,
  DatabaseOutlined,
  UserOutlined,
  TeamOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { LeftSidebarItem } from '../components/Sidebar/LeftSidebar.interface';
import { SidebarItem as SidebarItemEnum } from '../enum/sidebar.enum'; // Use enum alias

// Keep existing SidebarItem enum definition or import if separated

export const SIDEBAR_NESTED_KEYS: Record<string, string> = {
  '/batch/jobs': '/batch', // Link jobs back to main batch item
  '/history/details': '/history',
  // Add RAG nested keys if you have sub-routes later
  // '/rag-info/add': '/rag-info',
  // Add Admin nested keys
  '/admin/users/edit': '/admin/users',
  '/admin/roles/edit': '/admin/roles',
};

export const SIDEBAR_ITEMS: LeftSidebarItem[] = [
  {
    key: SidebarItemEnum.TEST,
    title: 'Test',
    icon: HomeOutlined,
    dataTestId: 'test',
    redirect_url: '/test',
  },
  {
    key: SidebarItemEnum.BATCH,
    title: 'Batch',
    icon: FileTextOutlined,
    dataTestId: 'batch',
    redirect_url: '/batch', // Main link might go to create or jobs
    disableExpandIcon: true, // Keep expansion manual via links if preferred
    // Note: The component structure implies sub-items might not be visually nested in the current sidebar
    // If true nesting is desired, LeftSidebar.component needs adjustment
    children: [
      // {
      //   key: SidebarItemEnum.BATCH_CREATE, // If create is separate page
      //   title: 'Create Batch',
      //   icon: PlusOutlined,
      //   dataTestId: 'create-batch',
      //   redirect_url: '/batch', // Or /batch/create
      // },
      {
        key: SidebarItemEnum.BATCH_JOBS,
        title: 'Batch Jobs',
        icon: AppstoreOutlined, // Re-use icon if needed
        dataTestId: 'batch-jobs',
        redirect_url: '/batch/jobs',
      }
    ]
  },
  {
    key: SidebarItemEnum.HISTORY,
    title: 'History',
    icon: HistoryOutlined,
    dataTestId: 'history',
    redirect_url: '/history',
  },
  // Chat Item will be inserted dynamically after History if RAG is disabled,
  // or after RAG if RAG is enabled.
  // Or, place it statically if RAG's position is also static.
  // For simplicity here, let's add it statically after history.
  // The dynamic insertion logic in LeftSidebar.component.tsx will need to account for this if RAG is also dynamic.
  // A better approach for dynamic insertion is to define a base array and then splice items in.
  // Given the current dynamic insertion of RAG_INFO_SIDEBAR_ITEM, it's better to let
  // LeftSidebar.component.tsx handle the insertion of CHAT_SIDEBAR_ITEM as well if its position is conditional.
  // For now, let's assume it's added to the base list and filtered by permission.
  // We'll refine LeftSidebar.component.tsx to insert it intelligently relative to RAG
];

export const RAG_INFO_SIDEBAR_ITEM: LeftSidebarItem = {
    key: SidebarItemEnum.RAG_INFO, // Use enum value
    title: 'Information', // Top-level item name
    icon: DatabaseOutlined, // Or another suitable icon
    dataTestId: 'rag-info',
    redirect_url: '/rag-info', // Link parent directly to the list view
    disableExpandIcon: true, // Keep simple for now
    requiredPermission: 'rag:view', // Add permission requirement
};

export const CHAT_SIDEBAR_ITEM: LeftSidebarItem = {
    key: SidebarItemEnum.CHAT,
    title: 'AI Chat',
    icon: MessageOutlined, // Use the imported icon
    dataTestId: 'chat',
    redirect_url: '/chat',
    requiredPermission: 'chat:use', // Example permission
};

// --- NEW Admin Section ---
export const ADMIN_SIDEBAR_ITEMS: LeftSidebarItem[] = [
    {
        key: SidebarItemEnum.ADMIN_USERS,
        title: 'Users',
        icon: UserOutlined,
        dataTestId: 'admin-users',
        redirect_url: '/admin/users',
        requiredPermission: 'users:view', // Permission needed to see this
    },
    {
        key: SidebarItemEnum.ADMIN_ROLES,
        title: 'Roles',
        icon: TeamOutlined, // Or SafetyCertificateOutlined
        dataTestId: 'admin-roles',
        redirect_url: '/admin/roles',
        requiredPermission: 'roles:view', // Permission needed to see this
    },
    // Add more admin items like Permissions if needed
];

export const SETTING_ITEM: LeftSidebarItem = {
  key: SidebarItemEnum.SETTINGS, // Use enum value
  title: 'Settings',
  redirect_url: '/settings',
  icon: SettingOutlined,
  dataTestId: 'settings',
  requiredPermission: 'config:view', // Add permission requirement
};

export const LOGOUT_ITEM: LeftSidebarItem = {
  key: SidebarItemEnum.LOGOUT, // Use enum value
  title: 'Logout',
  icon: LogoutOutlined,
  dataTestId: 'logout',
};

export const BOTTOM_SIDEBAR_ITEMS: LeftSidebarItem[] = [SETTING_ITEM, LOGOUT_ITEM];