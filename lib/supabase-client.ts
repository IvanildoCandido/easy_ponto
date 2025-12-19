import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Cliente Supabase para autenticação
// Inicializado apenas no cliente para evitar erros de SSR
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  // Se já existe, retornar
  if (supabaseClient) {
    return supabaseClient;
  }

  // Verificar se estamos no cliente
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

  // Criar e armazenar o cliente
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'easy-ponto-auth',
      // O Supabase gerencia refresh tokens automaticamente
      // Vamos controlar a expiração de 24 horas manualmente no código
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
  try {
    const client = getSupabaseClient();
    const { data: { session }, error } = await client.auth.getSession();
    if (error) {
      console.error('Erro ao obter sessão:', error);
      return null;
    }
    return session;
  } catch (error) {
    // Se não estiver no cliente, retornar null
    if (typeof window === 'undefined') {
      return null;
    }
    throw error;
  }
}

// Helper para fazer logout
export async function signOut() {
  try {
    const client = getSupabaseClient();
    const { error } = await client.auth.signOut();
    if (error) {
      console.error('Erro ao fazer logout:', error);
      throw error;
    }
  } catch (error) {
    if (typeof window === 'undefined') {
      return;
    }
    throw error;
  }
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
  
  // Armazenar timestamp do login para controle de expiração de 24 horas
  if (typeof window !== 'undefined' && data.session) {
    const loginTimestamp = Date.now();
    localStorage.setItem('easy-ponto-login-time', loginTimestamp.toString());
  }
  
  return data;
}

// Helper para obter o usuário atual
export async function getCurrentUser() {
  try {
    const client = getSupabaseClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error) {
      console.error('Erro ao obter usuário:', error);
      return null;
    }
    return user;
  } catch (error) {
    // Se não estiver no cliente, retornar null
    if (typeof window === 'undefined') {
      return null;
    }
    throw error;
  }
}

