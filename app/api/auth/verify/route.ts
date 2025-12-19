import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Criar cliente Supabase para uso no servidor
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Configuração do Supabase não encontrada' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Obter o token do header Authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verificar o token com o Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    // Verificar se a sessão não expirou (24 horas)
    const now = Math.floor(Date.now() / 1000);
    const sessionCreated = user.created_at ? new Date(user.created_at).getTime() / 1000 : 0;
    const hoursSinceCreation = (now - sessionCreated) / 3600;
    
    if (hoursSinceCreation >= 24) {
      return NextResponse.json(
        { error: 'Sessão expirada. Faça login novamente.' },
        { status: 401 }
      );
    }

    return NextResponse.json({ user: { id: user.id, email: user.email } });
  } catch (error: any) {
    console.error('Erro ao verificar autenticação:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar autenticação' },
      { status: 500 }
    );
  }
}

