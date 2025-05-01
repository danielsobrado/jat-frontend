// src/components/UserManagement/hooks/useUsers.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import {
  ApiClient, User, Role, CreateUserRequest, UpdateUserRequest,
  UserListResponse, RoleListResponse
} from '../../../api/types';

export interface UseUsersResult {
  users: User[];
  roles: Role[]; // Available roles for assignment
  loading: boolean;
  loadingRoles: boolean;
  error: string | null;
  totalUsers: number;
  pagination: { current: number; pageSize: number; total: number };
  fetchUsers: (page?: number, pageSize?: number, search?: string) => Promise<void>;
  createUser: (data: CreateUserRequest) => Promise<User | null>;
  updateUser: (id: number, data: UpdateUserRequest) => Promise<User | null>;
  deleteUser: (id: number) => Promise<boolean>;
}

const DEFAULT_PAGE_SIZE = 10;

export function useUsers(apiClient: ApiClient): UseUsersResult {
  const mountedRef = useRef(true);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]); // Store available roles
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentSearchRef = useRef<string | undefined>(undefined); // Keep track of search term

  // Safe state setters
  const safeSetState = <T>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (value: T | ((prevState: T) => T)) => {
      if (mountedRef.current) {
        setter(value);
      }
    };

  const safeSetUsers = safeSetState(setUsers);
  const safeSetRoles = safeSetState(setRoles);
  const safeSetTotalUsers = safeSetState(setTotalUsers);
  const safeSetCurrentPage = safeSetState(setCurrentPage);
  const safeSetPageSize = safeSetState(setPageSize);
  const safeSetLoading = safeSetState(setLoading);
  const safeSetLoadingRoles = safeSetState(setLoadingRoles);
  const safeSetError = safeSetState(setError);

  // Fetch Users Function
  const fetchUsers = useCallback(async (
    page = currentPage,
    limit = pageSize,
    search?: string
  ) => {
    if (!mountedRef.current) return;
    safeSetLoading(true);
    safeSetError(null);
    currentSearchRef.current = search; // Store current search

    try {
      const offset = (page - 1) * limit;
      const response = await apiClient.getUsers({ limit, offset, search });
      // Check if the request is still the latest one (based on search term)
      if (mountedRef.current && currentSearchRef.current === search) {
        safeSetUsers(response.items || []);
        safeSetTotalUsers(response.totalCount || 0);
        safeSetCurrentPage(page);
        safeSetPageSize(limit);
      }
    } catch (err) {
       if (mountedRef.current && currentSearchRef.current === search) {
           console.error('Failed to fetch users:', err);
           const errorMsg = err instanceof Error ? err.message : 'Failed to load users';
           safeSetError(errorMsg);
           message.error(errorMsg); // Show Ant Design message
           safeSetUsers([]);
           safeSetTotalUsers(0);
       }
    } finally {
      if (mountedRef.current && currentSearchRef.current === search) {
          safeSetLoading(false);
      }
    }
  }, [apiClient, currentPage, pageSize, safeSetLoading, safeSetError, safeSetUsers, safeSetTotalUsers, safeSetCurrentPage, safeSetPageSize]);

  // Fetch Available Roles Function
  const fetchRoles = useCallback(async () => {
    if (!mountedRef.current) return;
    safeSetLoadingRoles(true);
    try {
        // Fetch all roles (assuming pagination isn't strictly needed for dropdown)
        // Adjust if your backend needs specific parameters or handles large role lists
      const response: RoleListResponse = await apiClient.getRoles({ limit: 500 }); // Fetch a large number
      if (mountedRef.current) {
        safeSetRoles(response.items || []);
      }
    } catch (err) {
      if (mountedRef.current) {
        console.error('Failed to fetch roles:', err);
        message.error('Failed to load available roles for assignment.');
        safeSetRoles([]); // Set empty on error
      }
    } finally {
       if (mountedRef.current) {
           safeSetLoadingRoles(false);
       }
    }
  }, [apiClient, safeSetLoadingRoles, safeSetRoles]);


  // Initial Fetch & Fetch on Param Change
  useEffect(() => {
    fetchUsers(1, pageSize); // Fetch first page on mount/filter change
  }, [fetchUsers, pageSize]); // Rerun only when fetchUsers changes (due to apiClient) or pageSize

   // Fetch roles on mount
   useEffect(() => {
       fetchRoles();
   }, [fetchRoles]);


  // CRUD Operations
  const createUser = useCallback(async (data: CreateUserRequest): Promise<User | null> => {
    safeSetLoading(true); // Indicate loading during create
    safeSetError(null);
    try {
      const newUser = await apiClient.createUser(data);
      message.success(`User "${newUser.username}" created successfully.`);
      await fetchUsers(1, pageSize); // Refresh list from page 1
      return newUser;
    } catch (err) {
      console.error('Failed to create user:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to create user';
      safeSetError(errorMsg);
      message.error(errorMsg);
      return null;
    } finally {
       safeSetLoading(false);
    }
  }, [apiClient, fetchUsers, pageSize, safeSetLoading, safeSetError]);

  const updateUser = useCallback(async (id: number, data: UpdateUserRequest): Promise<User | null> => {
     safeSetLoading(true);
     safeSetError(null);
    try {
      const updatedUser = await apiClient.updateUser(id, data);
      message.success(`User "${updatedUser.username}" updated successfully.`);
      // Refresh only the current page for a potentially smoother experience
      await fetchUsers(currentPage, pageSize, currentSearchRef.current);
      return updatedUser;
    } catch (err) {
      console.error('Failed to update user:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to update user';
      safeSetError(errorMsg);
      message.error(errorMsg);
      return null;
    } finally {
       safeSetLoading(false);
    }
  }, [apiClient, fetchUsers, currentPage, pageSize, safeSetLoading, safeSetError]);

  const deleteUser = useCallback(async (id: number): Promise<boolean> => {
     safeSetLoading(true);
     safeSetError(null);
    try {
      await apiClient.deleteUser(id);
      message.success(`User deleted successfully.`);
       // Check if the deleted item was the last on the current page
       const newTotal = totalUsers - 1;
       const newTotalPages = Math.ceil(newTotal / pageSize);
       const pageToFetch = (currentPage > newTotalPages && newTotalPages > 0) ? newTotalPages : currentPage;
       // Refresh potentially adjusted page
       await fetchUsers(pageToFetch, pageSize, currentSearchRef.current);
       if (pageToFetch !== currentPage) safeSetCurrentPage(pageToFetch); // Update page state if changed
      return true;
    } catch (err) {
      console.error('Failed to delete user:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete user';
      safeSetError(errorMsg);
      message.error(errorMsg);
      return false;
    } finally {
       safeSetLoading(false);
    }
  }, [apiClient, fetchUsers, currentPage, pageSize, totalUsers, safeSetLoading, safeSetError, safeSetCurrentPage]);

  // Unmount cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    users,
    roles, // Provide roles
    loading,
    loadingRoles, // Provide roles loading state
    error,
    totalUsers,
    pagination: {
      current: currentPage,
      pageSize: pageSize,
      total: totalUsers,
    },
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  };
}