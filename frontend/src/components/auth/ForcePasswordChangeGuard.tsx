'use client';

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMe } from '@/lib/api';
import FirstTimePasswordChangeModal from '@/components/auth/FirstTimePasswordChangeModal';

export default function ForcePasswordChangeGuard({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const { data: meData } = useQuery({
    queryKey: ['fetchMe'],
    queryFn: fetchMe,
    staleTime: 5 * 60 * 1000,
  });

  const user = meData?.data?.user;

  // 1. Role-Based Exclusion: Exclude 'Admin' strictly from forced password change
  const isAdmin = user?.role === 'Admin';
  const mustChange = !isAdmin && !!user?.mustChangePassword;

  // 2. Complete UI Blocking: When password change is forced, ONLY render password modal
  if (mustChange && user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/95 p-4 backdrop-blur-md">
        <FirstTimePasswordChangeModal
          role={user.role}
          username={user.username}
          onPasswordChanged={() => {
            queryClient.invalidateQueries({ queryKey: ['fetchMe'] });
            queryClient.refetchQueries({ queryKey: ['fetchMe'] });
          }}
        />
      </div>
    );
  }

  return <>{children}</>;
}
