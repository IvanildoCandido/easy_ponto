import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Cliente Supabase para autenticação
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (typeof window === 'undefined') {
    throw new Error(
      'Supabase client só pode ser inicializado no cliente. Use apenas em componentes client-side.'
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'easy-ponto-auth',
    },
  });

  return supabaseClient;
}

// Exportar um proxy que inicializa o cliente apenas quando necessário
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

// Helper para verificar se o usuário está autenticado
export async function getSession() {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const client = getSupabaseClient();
    
    // Adicionar timeout para evitar travamento
    const sessionPromise = client.auth.getSession();
    const timeoutPromise = new Promise<{ data: { session: null }, error: null }>((resolve) => {
      setTimeout(() => {
        resolve({ data: { session: null }, error: null });
      }, 3000); // 3 segundos de timeout
    });
    
    const result = await Promise.race([sessionPromise, timeoutPromise]);
    
    // Se foi timeout, retornar null
    if (!result.data?.session && !result.error) {
      console.warn('Timeout ao obter sessão do Supabase');
      return null;
    }
    
    const { data: { session }, error } = result as any;
    
    if (error) {
      console.error('Erro ao obter sessão:', error);
      // Se houver erro de token inválido, limpar localStorage
      if (error.message?.includes('token') || error.message?.includes('expired')) {
        try {
          localStorage.removeItem('easy-ponto-auth');
        } catch (e) {
          // Ignorar erro ao limpar
        }
      }
      return null;
    }
    
    if (!session?.user) {
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Erro ao obter sessão:', error);
    // Em caso de erro grave, tentar limpar localStorage
    try {
      localStorage.removeItem('easy-ponto-auth');
    } catch (e) {
      // Ignorar erro ao limpar
    }
    return null;
  }
}

// Helper para fazer logout
export async function signOut() {
  const client = getSupabaseClient();
  await client.auth.signOut();
}

// Helper para fazer login
export async function signIn(email: string, password: string) {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    throw error;
  }
  
  return data;
}

// Helper para obter o usuário atual
export async function getCurrentUser() {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const client = getSupabaseClient();
    
    // Adicionar timeout para evitar travamento
    const userPromise = client.auth.getUser();
    const timeoutPromise = new Promise<{ data: { user: null }, error: null }>((resolve) => {
      setTimeout(() => {
        resolve({ data: { user: null }, error: null });
      }, 3000); // 3 segundos de timeout
    });
    
    const result = await Promise.race([userPromise, timeoutPromise]);
    
    // Se foi timeout, retornar null
    if (!result.data?.user && !result.error) {
      console.warn('Timeout ao obter usuário do Supabase');
      return null;
    }
    
    const { data: { user }, error } = result as any;
    
    if (error || !user) {
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    return null;
  }
}
