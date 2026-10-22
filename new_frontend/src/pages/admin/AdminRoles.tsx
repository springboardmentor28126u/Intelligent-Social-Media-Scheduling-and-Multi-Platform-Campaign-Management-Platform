import { useMemo } from 'react';
import { Users, ShieldCheck, Key } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Button from '@/components/common/Button';
import RolesAccessMatrix from '@/components/admin/RolesAccessMatrix';
import { useAuth } from '@/contexts/AuthContext';
import { ALL_ROLES, normalizeRole, type RoleName } from '@/lib/permissions';

export default function AdminRoles() {
  const { users } = useAuth();

  const userCounts = useMemo(() => {
    const counts: Record<RoleName, number> = {
      Administrator: 0,
      'Social Media Manager': 0,
      'Content Creator': 0,
      Analyst: 0,
    };
    users.forEach((u) => {
      const norm = normalizeRole(u.role);
      counts[norm] = (counts[norm] || 0) + 1;
    });
    return counts;
  }, [users]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader
        title="Roles of Access (RBAC)"
        description="Explore role-based access control policies, privilege matrices, and permissions across platform roles."
        action={
          <Button
            to="/admin/users"
            variant="secondary"
            size="md"
            leftIcon={<Users className="h-4 w-4" />}
          >
            Manage Users
          </Button>
        }
      />

      <RolesAccessMatrix userCounts={userCounts} />
    </div>
  );
}
