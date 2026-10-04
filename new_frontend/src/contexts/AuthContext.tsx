import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Profile, UserRole } from '@/lib/supabase';

type AuthContextValue = {
  isAuthenticated: boolean;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  users: Profile[];
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  toggleUserRole: (userId: string) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const API_BASE = 'http://localhost:8000';

function mapBackendRole(backendRole: string): UserRole {
  if (backendRole === 'Administrator') {
    return 'admin';
  }
  return 'creator';
}

function mapFrontendRole(frontendRole: UserRole): string {
  if (frontendRole === 'admin') {
    return 'Administrator';
  }
  return 'Content Creator';
}

interface BackendUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

function mapBackendUserToProfile(user: BackendUser): Profile {
  return {
    id: user.id.toString(),
    email: user.email,
    full_name: user.name,
    role: mapBackendRole(user.role),
    created_at: new Date().toISOString(), // Fallback since backend User does not have created_at
    updated_at: new Date().toISOString(),
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

        if (mappedProfile.role === 'admin') {
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

      if (mappedProfile.role === 'admin') {
        await fetchUsersList(token);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'An error occurred during sign in.' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: UserRole) => {
    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: fullName,
          email,
          password,
          role: mapFrontendRole(role),
        }),
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

  const toggleUserRole = async (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;
    const newFrontendRole: UserRole = targetUser.role === 'admin' ? 'creator' : 'admin';
    const newBackendRole = mapFrontendRole(newFrontendRole);

    setUsers((prevUsers) =>
      prevUsers.map((u) =>
        u.id === userId
          ? { ...u, role: newFrontendRole, updated_at: new Date().toISOString() }
          : u
      )
    );

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newBackendRole }),
      });
      if (!response.ok) {
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.id === userId
              ? { ...u, role: targetUser.role, updated_at: new Date().toISOString() }
              : u
          )
        );
      }
    } catch (err) {
      console.error('Failed to update user role:', err);
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === userId
            ? { ...u, role: targetUser.role, updated_at: new Date().toISOString() }
            : u
        )
      );
    }
  };

  const value: AuthContextValue = {
    isAuthenticated: !!profile,
    profile,
    role: profile?.role ?? null,
    loading,
    users,
    signIn,
    signUp,
    signOut,
    toggleUserRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

