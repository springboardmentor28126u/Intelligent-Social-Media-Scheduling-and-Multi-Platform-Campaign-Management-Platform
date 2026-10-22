import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Profile, UserRole } from '@/lib/supabase';
import {
  ALL_ROLES,
  ADMIN,
  CREATOR,
  normalizeRole,
  hasPermission as checkRolePermission,
  isAdminRole,
  type Permission,
  type RoleName,
} from '@/lib/permissions';

type AuthContextValue = {
  isAuthenticated: boolean;
  isAdmin: boolean;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  users: Profile[];
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateUserRole: (userId: string, newRole: RoleName | string) => Promise<void>;
  toggleUserRole: (userId: string) => Promise<void>;
  hasPermission: (perm: Permission) => boolean;
  refreshUsers: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const API_BASE = 'http://localhost:8000';

interface BackendUser {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

function mapBackendUserToProfile(user: BackendUser): Profile {
  return {
    id: user.id.toString(),
    email: user.email,
    full_name: user.name,
    role: normalizeRole(user.role),
    created_at: user.created_at || new Date().toISOString(),
    updated_at: user.updated_at || new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsersList = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = (await response.json()) as BackendUser[];
        setUsers(data.map(mapBackendUserToProfile));
      }
    } catch (err) {
      console.error('Failed to fetch admin users:', err);
    }
  };

  const refreshUsers = async () => {
    const token = localStorage.getItem('token');
    if (token && isAdminRole(profile?.role)) {
      await fetchUsersList(token);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Token is invalid or expired');
        }

        const userData = (await response.json()) as BackendUser;
        const mappedProfile = mapBackendUserToProfile(userData);
        setProfile(mappedProfile);

        if (isAdminRole(mappedProfile.role)) {
          await fetchUsersList(token);
        }
      } catch (err) {
        console.error('Failed to authenticate:', err);
        localStorage.removeItem('token');
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.detail || 'Failed to sign in. Please check your credentials.' };
      }

      const token = data.access_token;
      localStorage.setItem('token', token);

      // Fetch user profile immediately
      const profileResponse = await fetch(`${API_BASE}/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch profile after sign in');
      }

      const userData = (await profileResponse.json()) as BackendUser;
      const mappedProfile = mapBackendUserToProfile(userData);
      setProfile(mappedProfile);

      if (isAdminRole(mappedProfile.role)) {
        await fetchUsersList(token);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'An error occurred during sign in.' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role?: string) => {
    try {
      const payload: Record<string, any> = {
        name: fullName,
        email,
        password,
      };
      if (role) {
        payload.role = normalizeRole(role);
      }

      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.detail || 'Registration failed. Try a different email.' };
      }

      // Automatically sign in the user
      return await signIn(email, password);
    } catch (err: any) {
      return { error: err.message || 'An error occurred during registration.' };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('token');
    setProfile(null);
    setUsers([]);
  };

  const updateUserRole = async (userId: string, newRole: RoleName | string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    const normalizedNewRole = normalizeRole(newRole);

    // Optimistically update local users list
    setUsers((prevUsers) =>
      prevUsers.map((u) =>
        u.id === userId
          ? { ...u, role: normalizedNewRole, updated_at: new Date().toISOString() }
          : u
      )
    );

    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated');

    try {
      const response = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ role: normalizedNewRole }),
      });

      if (!response.ok) {
        // Revert optimistic update
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.id === userId
              ? { ...u, role: targetUser.role, updated_at: targetUser.updated_at }
              : u
          )
        );
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to update user role');
      }

      const updatedUser = (await response.json()) as BackendUser;
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === userId ? mapBackendUserToProfile(updatedUser) : u
        )
      );
    } catch (err) {
      // Revert optimistic update on network error
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === userId
            ? { ...u, role: targetUser.role, updated_at: targetUser.updated_at }
            : u
        )
      );
      throw err;
    }
  };

  const toggleUserRole = async (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;
    const nextRole = isAdminRole(targetUser.role) ? CREATOR : ADMIN;
    await updateUserRole(userId, nextRole);
  };

  const hasPermission = (perm: Permission): boolean => {
    return checkRolePermission(profile?.role, perm);
  };

  const value: AuthContextValue = {
    isAuthenticated: !!profile,
    isAdmin: isAdminRole(profile?.role),
    profile,
    role: profile?.role ?? null,
    loading,
    users,
    signIn,
    signUp,
    signOut,
    updateUserRole,
    toggleUserRole,
    hasPermission,
    refreshUsers,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
