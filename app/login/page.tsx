'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, getSession } from '@/lib/supabase-client';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Verificar se já está logado
  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        router.push('/');
      }
    };
    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password);
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50/30 to-accent-50/20 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Logo e Título */}
          <div className="text-center mb-8">
            <div className="relative w-24 h-24 mx-auto mb-4">
              <Image
                src="/logo.png"
                alt="Easy Ponto Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-3xl font-bold text-gradient mb-2">Easy Ponto</h1>
            <p className="text-sm text-neutral-600">Sistema de Controle de Ponto</p>
          </div>

          {/* Formulário de Login */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-neutral-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="seu@email.com"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-neutral-700 mb-2">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:bg-neutral-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Informações adicionais */}
          <div className="mt-6 pt-6 border-t border-neutral-200">
            <p className="text-xs text-center text-neutral-500">
              A sessão permanece ativa por 24 horas
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

