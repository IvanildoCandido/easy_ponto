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
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    // Função auxiliar para limpar storages completamente
    const clearAllStorages = () => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('easy-ponto-auth');
          localStorage.removeItem('easy-ponto-login-time');
          sessionStorage.clear();
        } catch (err) {
          // Ignorar erros ao limpar
        }
      }
    };

    // Timeout de segurança para evitar loading infinito
    timeoutId = setTimeout(() => {
      if (loading && isMounted) {
        console.warn('Timeout na verificação de sessão, limpando e redirecionando para login');
        clearAllStorages();
        setUser(null);
        setLoading(false);
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
    }, 5000); // 5 segundos de timeout

    // Verificar sessão inicial com timeout adicional
    const checkSession = async () => {
      try {
        // Timeout individual para getSession (3 segundos)
        const sessionPromise = getSession();
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => {
            console.warn('Timeout ao obter sessão no AuthProvider');
            resolve(null);
          }, 3000);
        });

        const session = await Promise.race([sessionPromise, timeoutPromise]);

        if (!isMounted) return;
        
        // Se não há sessão válida, limpar tudo e ir para login
        if (!session?.user) {
          clearAllStorages();
          // Tentar limpar também o token do Supabase se estiver corrompido
          try {
            await supabase.auth.signOut();
          } catch (err) {
            // Se falhar, apenas limpar o localStorage diretamente (já foi limpo acima)
          }
          setUser(null);
          setLoading(false);
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
            clearAllStorages();
            try {
              await supabase.auth.signOut();
            } catch (err) {
              // Se falhar, já foi limpo acima
            }
            setUser(null);
            setLoading(false);
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
        if (!isMounted) return;
        
        // Em caso de erro, limpar tudo e redirecionar para login
        clearAllStorages();
        try {
          await supabase.auth.signOut();
        } catch (err) {
          // Se falhar, já foi limpo acima
        }
        setUser(null);
        setLoading(false);
        if (pathname !== '/login') {
          router.push('/login');
        }
      } finally {
        // Garantir que o loading seja sempre desativado
        if (isMounted) {
          setLoading(false);
        }
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
          // Função auxiliar para limpar storages (mesma do escopo externo)
          const clearAllStoragesLocal = () => {
            if (typeof window !== 'undefined') {
              try {
                localStorage.removeItem('easy-ponto-auth');
                localStorage.removeItem('easy-ponto-login-time');
                sessionStorage.clear();
              } catch (err) {
                // Ignorar erros ao limpar
              }
            }
          };

          if (event === 'SIGNED_OUT' || !session) {
            clearAllStoragesLocal();
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
            setLoading(false);
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
                clearAllStoragesLocal();
                try {
                  await supabase.auth.signOut();
                } catch (err) {
                  // Se falhar, já foi limpo acima
                }
                setUser(null);
                setLoading(false);
                router.push('/login');
              }
            } else {
              // Sem timestamp, fazer logout
              clearAllStoragesLocal();
              try {
                await supabase.auth.signOut();
              } catch (err) {
                // Se falhar, já foi limpo acima
              }
              setUser(null);
              setLoading(false);
              router.push('/login');
            }
          } else {
            setLoading(false);
          }
        });
        subscription = authSubscription;
      } catch (error) {
        console.error('Erro ao configurar listener de autenticação:', error);
      }
    }

    // Verificar periodicamente se a sessão expirou (a cada 5 minutos)
    const interval = typeof window !== 'undefined' ? setInterval(async () => {
      if (!isMounted) return;

      try {
        const session = await getSession();
        if (session?.user) {
          const loginTimeStr = typeof window !== 'undefined' ? localStorage.getItem('easy-ponto-login-time') : null;
          
          if (loginTimeStr) {
            const loginTime = parseInt(loginTimeStr, 10);
            const now = Date.now();
            const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);
            
            if (hoursSinceLogin >= 24) {
              clearAllStorages();
              try {
                await supabase.auth.signOut();
              } catch (err) {
                // Se falhar, já foi limpo acima
              }
              setUser(null);
              setLoading(false);
              router.push('/login');
            }
          } else {
            // Sem timestamp, fazer logout
            clearAllStorages();
            try {
              await supabase.auth.signOut();
            } catch (err) {
              // Se falhar, já foi limpo acima
            }
            setUser(null);
            setLoading(false);
            router.push('/login');
          }
        }
      } catch (error) {
        // Em caso de erro na verificação periódica, limpar e fazer logout
        if (isMounted) {
          clearAllStorages();
          setUser(null);
          setLoading(false);
          router.push('/login');
        }
      }
    }, 5 * 60 * 1000) : null; // 5 minutos

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (subscription) {
        subscription.unsubscribe();
      }
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [router, pathname]);

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
