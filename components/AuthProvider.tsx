'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
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

  const handleSignOut = useCallback(async () => {
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
    router.refresh();
  }, [router]);

  useEffect(() => {
    // Timeout de segurança para evitar loading infinito
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('Timeout na verificação de sessão, limpando e redirecionando para login');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('easy-ponto-auth');
          localStorage.removeItem('easy-ponto-login-time');
        }
        setUser(null);
        setLoading(false);
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
    }, 5000); // 5 segundos de timeout

    // Verificar sessão inicial
    const checkSession = async () => {
      try {
        const session = await getSession();
        
        // Se não há sessão válida, limpar tudo e ir para login
        if (!session?.user) {
          if (typeof window !== 'undefined') {
            // Limpar dados do localStorage se não há sessão válida
            localStorage.removeItem('easy-ponto-login-time');
            // Tentar limpar também o token do Supabase se estiver corrompido
            try {
              await supabase.auth.signOut();
            } catch (err) {
              // Se falhar, apenas limpar o localStorage diretamente
              localStorage.removeItem('easy-ponto-auth');
            }
          }
          setUser(null);
          if (pathname !== '/login') {
            router.push('/login');
          }
          return;
        }

        // Se há sessão válida, verificar se já passou 24 horas desde o login
        const loginTimeStr = typeof window !== 'undefined' ? localStorage.getItem('easy-ponto-login-time') : null;
        
        if (loginTimeStr) {
          const loginTime = parseInt(loginTimeStr, 10);
          if (isNaN(loginTime)) {
            // Timestamp inválido, criar um novo
            if (typeof window !== 'undefined') {
              localStorage.setItem('easy-ponto-login-time', Date.now().toString());
            }
            setUser(session.user);
            return;
          }
          
          const now = Date.now();
          const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);
          
          if (hoursSinceLogin >= 24) {
            // Sessão expirada (24 horas), fazer logout
            if (typeof window !== 'undefined') {
              localStorage.removeItem('easy-ponto-login-time');
              try {
                await supabase.auth.signOut();
              } catch (err) {
                localStorage.removeItem('easy-ponto-auth');
              }
            }
            setUser(null);
            if (pathname !== '/login') {
              router.push('/login');
            }
            return;
          }
          
          // Sessão válida e dentro das 24 horas
          setUser(session.user);
        } else {
          // Se não há timestamp de login, mas há sessão válida, criar um agora
          if (typeof window !== 'undefined') {
            localStorage.setItem('easy-ponto-login-time', Date.now().toString());
          }
          setUser(session.user);
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        // Em caso de erro, limpar tudo e redirecionar para login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('easy-ponto-login-time');
          try {
            await supabase.auth.signOut();
          } catch (err) {
            // Se falhar, limpar manualmente
            localStorage.removeItem('easy-ponto-auth');
          }
        }
        setUser(null);
        if (pathname !== '/login') {
          router.push('/login');
        }
      } finally {
        // Garantir que o loading seja sempre desativado
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
            if (typeof window !== 'undefined') {
              localStorage.removeItem('easy-ponto-login-time');
            }
            setUser(null);
            setLoading(false);
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
      clearTimeout(timeoutId);
      if (subscription) {
        subscription.unsubscribe();
      }
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [router, pathname, loading]);

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
