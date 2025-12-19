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

  useEffect(() => {
    // Verificar sessão inicial
    const checkSession = async () => {
      try {
        const session = await getSession();
        if (session?.user) {
          // Verificar se já passou 24 horas desde o login
          const loginTimeStr = typeof window !== 'undefined' ? localStorage.getItem('easy-ponto-login-time') : null;
          
          if (loginTimeStr) {
            const loginTime = parseInt(loginTimeStr, 10);
            const now = Date.now();
            const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60); // Converter para horas
            
            if (hoursSinceLogin >= 24) {
              // Sessão expirada (24 horas), fazer logout
              if (typeof window !== 'undefined') {
                localStorage.removeItem('easy-ponto-login-time');
              }
              await supabase.auth.signOut();
              setUser(null);
              if (pathname !== '/login') {
                router.push('/login');
              }
            } else {
              setUser(session.user);
            }
          } else {
            // Se não há timestamp de login, mas há sessão, criar um agora
            // (pode ser um refresh token ou sessão existente)
            if (typeof window !== 'undefined') {
              localStorage.setItem('easy-ponto-login-time', Date.now().toString());
            }
            setUser(session.user);
          }
        } else {
          // Limpar timestamp se não há sessão
          if (typeof window !== 'undefined') {
            localStorage.removeItem('easy-ponto-login-time');
          }
          setUser(null);
          if (pathname !== '/login') {
            router.push('/login');
          }
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('easy-ponto-login-time');
        }
        setUser(null);
        if (pathname !== '/login') {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Ouvir mudanças na autenticação (apenas no cliente)
    let subscription: any = null;
    
    if (typeof window !== 'undefined') {
      try {
        const {
          data: { subscription: authSubscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT' || !session) {
            setUser(null);
            if (pathname !== '/login') {
              router.push('/login');
            }
          } else if (event === 'SIGNED_IN') {
            // Ao fazer login, armazenar timestamp
            if (typeof window !== 'undefined') {
              localStorage.setItem('easy-ponto-login-time', Date.now().toString());
            }
            const currentUser = await getCurrentUser();
            if (currentUser) {
              setUser(currentUser);
            }
          } else if (event === 'TOKEN_REFRESHED') {
            // Verificar se ainda está dentro das 24 horas
            const loginTimeStr = typeof window !== 'undefined' ? localStorage.getItem('easy-ponto-login-time') : null;
            
            if (loginTimeStr) {
              const loginTime = parseInt(loginTimeStr, 10);
              const now = Date.now();
              const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);
              
              if (hoursSinceLogin < 24) {
                const currentUser = await getCurrentUser();
                if (currentUser) {
                  setUser(currentUser);
                }
              } else {
                // Sessão expirada
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('easy-ponto-login-time');
                }
                await supabase.auth.signOut();
                setUser(null);
                router.push('/login');
              }
            } else {
              // Sem timestamp, fazer logout
              await supabase.auth.signOut();
              setUser(null);
              router.push('/login');
            }
          }
          setLoading(false);
        });
        subscription = authSubscription;
      } catch (error) {
        console.error('Erro ao configurar listener de autenticação:', error);
      }
    }

    // Verificar periodicamente se a sessão expirou (a cada 5 minutos)
    const interval = typeof window !== 'undefined' ? setInterval(async () => {
      const session = await getSession();
      if (session?.user) {
        const loginTimeStr = typeof window !== 'undefined' ? localStorage.getItem('easy-ponto-login-time') : null;
        
        if (loginTimeStr) {
          const loginTime = parseInt(loginTimeStr, 10);
          const now = Date.now();
          const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);
          
          if (hoursSinceLogin >= 24) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('easy-ponto-login-time');
            }
            await supabase.auth.signOut();
            setUser(null);
            router.push('/login');
          }
        } else {
          // Sem timestamp, fazer logout
          await supabase.auth.signOut();
          setUser(null);
          router.push('/login');
        }
      }
    }, 5 * 60 * 1000) : null; // 5 minutos

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [router, pathname]);

  const handleSignOut = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('easy-ponto-login-time');
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
      }
    }
    setUser(null);
    router.push('/login');
  };

  // Se estiver carregando e não estiver na página de login, mostrar loading
  if (loading && pathname !== '/login') {
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
  // (o router.push vai redirecionar)
  if (!user && pathname !== '/login') {
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
