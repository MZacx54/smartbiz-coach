import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { securityLockService } from '../services/authService';

/**
 * Shared hook for Owner vs Apprentice/Staff Mode across devices.
 * Automatically syncs with `/api/users/security-lock/` on mount and window focus,
 * and listens to `sb-apprentice-mode-changed` events in the current tab.
 */
export function useOwnerLock() {
  const [isStaffMode, setIsStaffMode] = useState<boolean>(() =>
    securityLockService.isApprenticeModeActive()
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  useEffect(() => {
    const handleModeChanged = (e: any) => {
      const active =
        e?.detail?.isApprenticeMode ?? securityLockService.isApprenticeModeActive();
      setIsStaffMode(Boolean(active));
    };
    window.addEventListener('sb-apprentice-mode-changed', handleModeChanged);

    const syncFromCloud = async () => {
      if (!localStorage.getItem('sb_auth_token')) return;
      try {
        const res = await api.get('users/security-lock/');
        if (res?.data && typeof res.data.is_apprentice_mode === 'boolean') {
          securityLockService.syncFromUserOrBrand(res.data);
          setIsStaffMode(res.data.is_apprentice_mode);
        }
      } catch {
        // Keep local state if offline
      }
    };

    syncFromCloud();
    window.addEventListener('focus', syncFromCloud);
    return () => {
      window.removeEventListener('sb-apprentice-mode-changed', handleModeChanged);
      window.removeEventListener('focus', syncFromCloud);
    };
  }, []);

  const lockToStaff = useCallback(async () => {
    await securityLockService.lockApprenticeMode();
    setIsStaffMode(true);
    toast('Staff Mode on. Petty cash and profits are locked on all devices.', {
      icon: '🔒',
      duration: 4000,
    });
  }, []);

  const unlockOwner = useCallback(async (passcode: string): Promise<boolean> => {
    setIsVerifying(true);
    setUnlockError('');
    try {
      const result = await securityLockService.verifyOrUnlockOwnerPasscode(
        passcode,
        'UNLOCK'
      );
      if (result.verified) {
        setIsStaffMode(false);
        toast.success('Owner Mode unlocked. Full access restored.', { icon: '👑' });
        return true;
      } else {
        setUnlockError(result.error || 'Incorrect Owner Security Password.');
        return false;
      }
    } finally {
      setIsVerifying(false);
    }
  }, []);

  return {
    isStaffMode,
    isVerifying,
    unlockError,
    setUnlockError,
    lockToStaff,
    unlockOwner,
  };
}
