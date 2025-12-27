'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase, getSession, getCurrentUser } from '@/lib/supabase-client';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
    setUser(null);
    router.push('/login');
  };

  useEffect(() => {
    let mounted = true;
    let subscription: any = null;
    let timeoutId: NodeJS.Timeout | null = null;

    // Se já estiver na página de login, não bloquear renderização
    if (pathname === '/login') {
      setLoading(false);
    }

    // Verificar sessão inicial com timeout de segurança
    const checkSession = async () => {
      try {
        // Timeout de 5 segundos para evitar travamento
        const sessionPromise = getSession();
        const timeoutPromise = new Promise<null>((resolve) => {
          timeoutId = setTimeout(() => {
            console.warn('Timeout ao verificar sessão no AuthProvider');
            resolve(null);
          }, 5000);
        });

        const session = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (!mounted) return;
        
        if (session?.user) {
          const currentUser = await getCurrentUser();
          if (currentUser && mounted) {
            setUser(currentUser);
            setLoading(false);
          } else if (mounted) {
            setUser(null);
            setLoading(false);
          }
        } else {
          setUser(null);
          setLoading(false);
          if (pathname !== '/login') {
            router.push('/login');
          }
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
          if (pathname !== '/login') {
            router.push('/login');
          }
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (mounted && pathname === '/login') {
          // Garantir que sempre desativa loading na página de login
          setLoading(false);
        }
      }
    };

    checkSession();

    // Ouvir mudanças na autenticação
    try {
      const {
        data: { subscription: authSubscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setLoading(false);
          if (pathname !== '/login') {
            router.push('/login');
          }
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const currentUser = await getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
          }
          setLoading(false);
        }
      });
      subscription = authSubscription;
    } catch (error) {
      console.error('Erro ao configurar listener de autenticação:', error);
      if (mounted) {
        setLoading(false);
      }
    }

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [router, pathname]);

  // Se estiver na página de login, sempre permitir renderizar (não bloquear com loading)
  if (pathname === '/login') {
    return (
      <AuthContext.Provider value={{ user, loading, signOut: handleSignOut }}>
        {children}
      </AuthContext.Provider>
    );
  }

  // Mostrar loading apenas se estiver carregando e não estiver na página de login
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-primary-50/30 to-accent-50/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado e não estiver na página de login, não renderizar nada
  if (!user) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
