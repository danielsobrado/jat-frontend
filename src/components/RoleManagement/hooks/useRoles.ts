// src/components/RoleManagement/hooks/useRoles.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import {
  ApiClient, Role, Permission, CreateRoleRequest, UpdateRoleRequest,
  RoleListResponse, PermissionListResponse
} from '../../../api/types'; // Adjust path as needed

export interface UseRolesResult {
  roles: Role[];
  permissions: Permission[]; // All available permissions
  loading: boolean;
  loadingPermissions: boolean;
  error: string | null;
  totalRoles: number;
  // Add pagination state if needed for roles list
  // pagination: { current: number; pageSize: number; total: number };
  fetchRoles: () => Promise<void>; // Reload roles list
  fetchPermissions: () => Promise<void>; // Reload permissions
  createRole: (data: CreateRoleRequest) => Promise<Role | null>;
  updateRole: (id: number, data: UpdateRoleRequest) => Promise<Role | null>;
  deleteRole: (id: number) => Promise<boolean>;
}

export function useRoles(apiClient: ApiClient): UseRolesResult {
  const mountedRef = useRef(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [totalRoles, setTotalRoles] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Safe state setters
  const safeSetState = <T,>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (value: T | ((prevState: T) => T)) => {
      if (mountedRef.current) {
        setter(value);
      }
    };
  const safeSetRoles = safeSetState(setRoles);
  const safeSetPermissions = safeSetState(setPermissions);
  const safeSetTotalRoles = safeSetState(setTotalRoles);
  const safeSetLoading = safeSetState(setLoading);
  const safeSetLoadingPermissions = safeSetState(setLoadingPermissions);
  const safeSetError = safeSetState(setError);

  const fetchRoles = useCallback(async () => {
    if (!mountedRef.current) return;
    safeSetLoading(true);
    safeSetError(null);
    try {
      // Fetch roles (assuming a reasonable limit for now, add pagination if needed)
      const response = await apiClient.getRoles({ limit: 500 });
      if (mountedRef.current) {
        // Ensure permissions array exists on each role
        const rolesWithPerms = (response.items || []).map(role => ({
            ...role,
            permissions: role.permissions || [] // Default to empty array
        }));
        safeSetRoles(rolesWithPerms);
        safeSetTotalRoles(response.totalCount || 0);
      }
    } catch (err) {
      if (mountedRef.current) {
        console.error('Failed to fetch roles:', err);
        const msg = err instanceof Error ? err.message : 'Failed to load roles';
        safeSetError(msg);
        message.error(msg);
        safeSetRoles([]);
        safeSetTotalRoles(0);
      }
    } finally {
      if (mountedRef.current) safeSetLoading(false);
    }
  }, [apiClient, safeSetLoading, safeSetError, safeSetRoles, safeSetTotalRoles]);

  const fetchPermissions = useCallback(async () => {
    if (!mountedRef.current) return;
    safeSetLoadingPermissions(true);
    safeSetError(null); // Clear general error when loading permissions
    try {
      const response = await apiClient.getPermissions();
      if (mountedRef.current) {
        safeSetPermissions(response.items || []);
      }
    } catch (err) {
      if (mountedRef.current) {
        console.error('Failed to fetch permissions:', err);
        const msg = err instanceof Error ? err.message : 'Failed to load permissions list';
        safeSetError(msg); // Set error specific to permissions loading
        message.error(msg);
        safeSetPermissions([]); // Set empty on error
      }
    } finally {
      if (mountedRef.current) safeSetLoadingPermissions(false);
    }
  }, [apiClient, safeSetLoadingPermissions, safeSetPermissions, safeSetError]);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [fetchRoles, fetchPermissions]);

  const createRole = useCallback(async (data: CreateRoleRequest): Promise<Role | null> => {
    safeSetLoading(true); safeSetError(null);
    try {
      const newRole = await apiClient.createRole(data);
      message.success(`Role "${newRole.name}" created successfully.`);
      await fetchRoles(); // Refresh list
      return newRole;
    } catch (err) {
      console.error('Failed to create role:', err);
      const msg = err instanceof Error ? err.message : 'Failed to create role';
      safeSetError(msg);
      message.error(msg);
      return null;
    } finally {
      safeSetLoading(false);
    }
  }, [apiClient, fetchRoles, safeSetLoading, safeSetError]);

  const updateRole = useCallback(async (id: number, data: UpdateRoleRequest): Promise<Role | null> => {
    safeSetLoading(true); safeSetError(null);
    try {
      const updatedRole = await apiClient.updateRole(id, data);
      message.success(`Role "${updatedRole.name}" updated successfully.`);
      await fetchRoles(); // Refresh list
      return updatedRole;
    } catch (err) {
      console.error('Failed to update role:', err);
      const msg = err instanceof Error ? err.message : 'Failed to update role';
      safeSetError(msg);
      message.error(msg);
      return null;
    } finally {
      safeSetLoading(false);
    }
  }, [apiClient, fetchRoles, safeSetLoading, safeSetError]);

  const deleteRole = useCallback(async (id: number): Promise<boolean> => {
    safeSetLoading(true); safeSetError(null);
    try {
      await apiClient.deleteRole(id);
      message.success(`Role deleted successfully.`);
      await fetchRoles(); // Refresh list
      return true;
    } catch (err) {
      console.error('Failed to delete role:', err);
      const msg = err instanceof Error ? err.message : 'Failed to delete role';
      safeSetError(msg);
      message.error(msg);
      return false;
    } finally {
      safeSetLoading(false);
    }
  }, [apiClient, fetchRoles, safeSetLoading, safeSetError]);

  useEffect(() => { // Mount cleanup
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  return {
    roles,
    permissions,
    loading,
    loadingPermissions,
    error,
    totalRoles,
    // pagination: { current: 1, pageSize: 500, total: totalRoles }, // Add pagination if needed
    fetchRoles,
    fetchPermissions,
    createRole,
    updateRole,
    deleteRole,
  };
}