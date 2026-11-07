import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getProfile } from '@/lib/api';
import { configurePurchases } from '@/lib/purchases';
import { isConfigured, supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

GoogleSignin.configure({
  // El "Web client ID" de Google Cloud: Supabase valida el token contra este cliente
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  scopes: ['email', 'profile'],
});

export type SignInResult = 'ok' | 'cancelled' | 'play_services' | 'not_configured' | 'failed';

type AuthState = {
  session: Session | null;
  ready: boolean;
  profile: Profile | undefined;
  refreshProfile: () => Promise<unknown>;
  signInWithGoogle: () => Promise<SignInResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) queryClient.clear();
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const userId = session?.user.id;
  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: getProfile,
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (userId) configurePurchases(userId);
  }, [userId]);

  const signInWithGoogle = useCallback(async (): Promise<SignInResult> => {
    if (!isConfigured || !process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) return 'not_configured';
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return 'cancelled';
      const idToken = response.data.idToken;
      if (!idToken) return 'failed';
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
      return error ? 'failed' : 'ok';
    } catch (err) {
      if (isErrorWithCode(err)) {
        if (err.code === statusCodes.SIGN_IN_CANCELLED || err.code === statusCodes.IN_PROGRESS) return 'cancelled';
        if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return 'play_services';
      }
      return 'failed';
    }
  }, []);

  const signOut = useCallback(async () => {
    await GoogleSignin.signOut().catch(() => {});
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      ready: ready && (!userId || !profileQuery.isPending),
      profile: profileQuery.data,
      refreshProfile: profileQuery.refetch,
      signInWithGoogle,
      signOut,
    }),
    [session, ready, userId, profileQuery.isPending, profileQuery.data, profileQuery.refetch, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Nombre corto para saludar. */
export function firstName(profile: Profile | undefined, session: Session | null): string {
  const full = profile?.full_name ?? (session?.user.user_metadata?.full_name as string | undefined) ?? '';
  return full.split(' ')[0] || '';
}
