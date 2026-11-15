import { createContext, useContext } from 'react';
import type { useAuthScreens, AuthScreensProps } from './useAuthScreens';
export type AuthState = ReturnType<typeof useAuthScreens> &
  Pick<AuthScreensProps, 'sessionNotice'>;
export const AuthStateContext = createContext<AuthState | null>(null);
export function useAuthState(): AuthState {
  const value = useContext(AuthStateContext);
  if (!value) throw new Error('Auth state provider is missing');
  return value;
}
