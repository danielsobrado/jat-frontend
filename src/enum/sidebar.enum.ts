// Define the sidebar items enum
export enum SidebarItem {
  HOME = '/', // Often a redirect
  TEST = '/test',
  BATCH = '/batch',
  BATCH_CREATE = '/batch/create', // If you have a separate create page for batch
  BATCH_JOBS = '/batch/jobs',
  HISTORY = '/history',
  CHAT = '/chat', // From your App.tsx
  RAG_INFO = '/rag-info',

  // LangGraph Visualization ---
  LANGGRAPH_LIST = '/langgraph',
  LANGGRAPH_VIEW = '/langgraph/view', // Base path, actual view will be /view/:graphId
  LANGGRAPH_CREATE = '/langgraph/create',
  LANGGRAPH_EDIT = '/langgraph/edit', // If you create an edit page

  // Admin ---
  ADMIN_USERS = '/admin/users',
  ADMIN_ROLES = '/admin/roles',

  // Bottom Items ---
  SETTINGS = '/settings',
  LOGOUT = 'logout', // Special key, not a URL path
}