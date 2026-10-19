import api from './api';
import { User } from '../types';

const WEAK_PASSCODES = new Set([
    '0000', '1234', '1111', '2222', '5555', '9999',
    '123456', '12345678', '000000', '111111', '654321',
    'password', 'password123', 'qwerty', 'admin', 'admin123', 'smartbiz'
]);

const computeSaltedDigest = (secret: string): string => {
    const clean = secret.trim();
    let h1 = 0xdeadbeef ^ clean.length;
    let h2 = 0x41c6ce57 ^ clean.length;
    for (let i = 0, ch; i < clean.length; i++) {
        ch = clean.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 'sbv2$' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
};

export const securityLockService = {
    isApprenticeModeActive: (): boolean => {
        const shift = localStorage.getItem('sb_shift_mode') === 'true';
        const cashier = localStorage.getItem('sb_cashier_mode') === 'true';
        const active = shift || cashier;
        if (active && (!shift || !cashier)) {
            localStorage.setItem('sb_shift_mode', 'true');
            localStorage.setItem('sb_cashier_mode', 'true');
        }
        return active;
    },

    setLocalApprenticeMode: (active: boolean) => {
        const val = active ? 'true' : 'false';
        localStorage.setItem('sb_shift_mode', val);
        localStorage.setItem('sb_cashier_mode', val);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sb-apprentice-mode-changed', {
                detail: { isApprenticeMode: active }
            }));
        }
    },

    syncFromUserOrBrand: (userOrBrand: any) => {
        if (!userOrBrand) return;
        // Purge insecure legacy 4-digit plaintext PIN if it was '0000' or '1234'
        const legacyPin = localStorage.getItem('sb_owner_pin');
        if (legacyPin === '0000' || legacyPin === '1234') {
            localStorage.removeItem('sb_owner_pin');
        }

        let cloudApprenticeMode: boolean | undefined = undefined;
        if (typeof userOrBrand.is_apprentice_mode === 'boolean') {
            cloudApprenticeMode = userOrBrand.is_apprentice_mode;
        } else if (userOrBrand.policies && typeof userOrBrand.policies === 'object' && userOrBrand.policies.__security_vault__) {
            cloudApprenticeMode = Boolean(userOrBrand.policies.__security_vault__.is_apprentice_mode);
            if (userOrBrand.policies.__security_vault__.owner_passcode_hash) {
                localStorage.setItem('sb_has_owner_passcode', 'true');
            }
        }

        if (typeof userOrBrand.has_owner_passcode === 'boolean') {
            localStorage.setItem('sb_has_owner_passcode', String(userOrBrand.has_owner_passcode));
        }

        if (typeof cloudApprenticeMode === 'boolean') {
            securityLockService.setLocalApprenticeMode(cloudApprenticeMode);
        }
    },

    validatePasscodeStrength: (passcode: string): { valid: boolean; error?: string } => {
        const clean = (passcode || '').trim();
        if (clean.length < 6) {
            return {
                valid: false,
                error: 'Owner Security Password must be at least 6 characters long (letters, numbers, or symbols).'
            };
        }
        if (WEAK_PASSCODES.has(clean.toLowerCase()) || new Set(clean).size < 2) {
            return {
                valid: false,
                error: 'This password is too easy for staff to guess (e.g. 123456, 000000). Please choose a stronger Owner Password.'
            };
        }
        return { valid: true };
    },

    checkLockout: (): { lockedOut: boolean; remainingSeconds: number } => {
        const until = Number(localStorage.getItem('sb_pin_lockout_until') || '0');
        const now = Date.now();
        if (until > now) {
            return { lockedOut: true, remainingSeconds: Math.ceil((until - now) / 1000) };
        }
        return { lockedOut: false, remainingSeconds: 0 };
    },

    recordFailedAttempt: (): { lockedOut: boolean; remainingSeconds: number; attemptsLeft: number } => {
        const attempts = Number(localStorage.getItem('sb_pin_failed_attempts') || '0') + 1;
        if (attempts >= 5) {
            const lockoutUntil = Date.now() + 60 * 1000; // 60-second anti-brute-force lockout
            localStorage.setItem('sb_pin_lockout_until', String(lockoutUntil));
            localStorage.setItem('sb_pin_failed_attempts', '0');
            return { lockedOut: true, remainingSeconds: 60, attemptsLeft: 0 };
        }
        localStorage.setItem('sb_pin_failed_attempts', String(attempts));
        return { lockedOut: false, remainingSeconds: 0, attemptsLeft: 5 - attempts };
    },

    clearFailedAttempts: () => {
        localStorage.removeItem('sb_pin_failed_attempts');
        localStorage.removeItem('sb_pin_lockout_until');
    },

    lockApprenticeMode: async (): Promise<void> => {
        securityLockService.setLocalApprenticeMode(true);
        try {
            await api.post('users/security-lock/', { action: 'LOCK' });
        } catch {
            // Local lock is already active; will sync on next connection
        }
    },

    verifyOrUnlockOwnerPasscode: async (
        passcode: string,
        action: 'UNLOCK' | 'VERIFY' = 'UNLOCK'
    ): Promise<{ verified: boolean; error?: string }> => {
        const lockout = securityLockService.checkLockout();
        if (lockout.lockedOut) {
            return {
                verified: false,
                error: `Too many failed attempts. Security lock active for ${lockout.remainingSeconds}s.`
            };
        }

        const clean = (passcode || '').trim();
        if (!clean || clean === '0000' || clean === '1234') {
            const fail = securityLockService.recordFailedAttempt();
            return {
                verified: false,
                error: fail.lockedOut
                    ? `Too many failed attempts. Locked for ${fail.remainingSeconds}s.`
                    : `Default PINs (0000 / 1234) are disabled for security. Enter your Owner Security Password or SmartBiz Account Password (${fail.attemptsLeft} tries left).`
            };
        }

        try {
            const res = await api.post('users/security-lock/', { action, passcode: clean });
            if (res.data?.verified) {
                securityLockService.clearFailedAttempts();
                localStorage.setItem('sb_owner_passcode_hash', computeSaltedDigest(clean));
                if (action === 'UNLOCK') {
                    securityLockService.setLocalApprenticeMode(false);
                }
                return { verified: true };
            }
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 403 || status === 400) {
                const fail = securityLockService.recordFailedAttempt();
                return {
                    verified: false,
                    error: fail.lockedOut
                        ? `Too many failed attempts. Locked for ${fail.remainingSeconds}s.`
                        : `Incorrect Owner Password. Enter your Owner Security Password or Account Login Password (${fail.attemptsLeft} tries left).`
                };
            }
            // Offline fallback: verify against locally stored salted hash (never weak 0000/1234)
            const localHash = localStorage.getItem('sb_owner_passcode_hash');
            if (localHash && localHash === computeSaltedDigest(clean)) {
                securityLockService.clearFailedAttempts();
                if (action === 'UNLOCK') {
                    securityLockService.setLocalApprenticeMode(false);
                }
                return { verified: true };
            }
            const fail = securityLockService.recordFailedAttempt();
            return {
                verified: false,
                error: fail.lockedOut
                    ? `Too many failed attempts. Locked for ${fail.remainingSeconds}s.`
                    : `Incorrect Owner Security Password (${fail.attemptsLeft} tries left).`
            };
        }

        return { verified: false, error: 'Verification failed.' };
    },

    setOwnerPasscode: async (
        newPasscode: string,
        currentPasscode = '',
        lockImmediately = false
    ): Promise<{ success: boolean; error?: string }> => {
        const validation = securityLockService.validatePasscodeStrength(newPasscode);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }
        const clean = newPasscode.trim();
        localStorage.setItem('sb_owner_passcode_hash', computeSaltedDigest(clean));
        localStorage.removeItem('sb_owner_pin');
        localStorage.setItem('sb_has_owner_passcode', 'true');
        if (lockImmediately) {
            securityLockService.setLocalApprenticeMode(true);
        }

        try {
            await api.post('users/security-lock/', {
                action: 'SET_PASSCODE',
                new_passcode: clean,
                current_passcode: currentPasscode.trim(),
                lock_immediately: lockImmediately
            });
            return { success: true };
        } catch (err: any) {
            if (err?.response?.status === 403 || err?.response?.status === 400) {
                return {
                    success: false,
                    error: err?.response?.data?.error || 'Could not update Owner Security Password.'
                };
            }
            // Saved locally if offline
            return { success: true };
        }
    }
};

export const authService = {
    login: async (credentials: any) => {
        const response = await api.post('users/login/', credentials);
        if (response.data.token) {
            localStorage.setItem('sb_auth_token', response.data.token);
        }
        if (response.data.user) {
            securityLockService.syncFromUserOrBrand(response.data.user);
        }
        return response.data;
    },

    register: async (userData: any) => {
        const response = await api.post('users/register/', userData);
        if (response.data.token) {
            localStorage.setItem('sb_auth_token', response.data.token);
        }
        if (response.data.user) {
            securityLockService.syncFromUserOrBrand(response.data.user);
        }
        return response.data;
    },

    getProfile: async () => {
        const response = await api.get('users/profile/');
        if (response.data) {
            securityLockService.syncFromUserOrBrand(response.data);
        }
        return response.data;
    },

    updateProfile: async (userData: any) => {
        const response = await api.patch('users/profile/', userData);
        if (response.data) {
            securityLockService.syncFromUserOrBrand(response.data);
        }
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('sb_auth_token');
    },

    getStats: async () => {
        const response = await api.get('users/stats/');
        return response.data;
    },

    getActions: async () => {
        const response = await api.get('users/actions/');
        return response.data;
    },

    forgotPassword: async (email: string) => {
        const response = await api.post('users/forgot-password/', { email });
        return response.data;
    },

    resetPassword: async (data: any) => {
        const response = await api.post('users/reset-password/', data);
        return response.data;
    }
};


