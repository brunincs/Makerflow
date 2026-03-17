import { createContext, useContext, ReactNode } from 'react';
import { Profile } from '../types';

interface AuthContextType {
  user: null;
  session: null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// TEMPORARIO: Auth desabilitado para debug
export function AuthProvider({ children }: { children: ReactNode }) {
  const mockProfile: Profile = {
    id: 'temp-user',
    name: 'Usuario Temp',
    email: 'temp@temp.com',
    role: 'admin',
    suspended: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <AuthContext.Provider
      value={{
        user: null,
        session: null,
        profile: mockProfile,
        loading: false,
        isAdmin: true,
        isAuthenticated: true,
        signIn: async () => ({ error: null }),
        signUp: async () => ({ error: null }),
        signOut: async () => {},
        resetPassword: async () => ({ error: null }),
        updateProfile: async () => ({ error: null }),
        refreshProfile: async () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
