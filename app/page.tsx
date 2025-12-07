'use client';

import { useState } from 'react';
import Image from 'next/image';
import FileUpload from '@/components/FileUpload';
import ScheduleConfig from '@/components/ScheduleConfig';
import ReportsView from '@/components/ReportsView';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'upload' | 'schedules' | 'reports'>('upload');

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50/30 to-accent-50/20">
      {/* Header Moderno */}
      <header className="bg-white/80 backdrop-blur-sm shadow-soft border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-5">
              <div className="relative w-20 h-20 flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="Animali Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gradient">Easy Ponto</h1>
                <p className="text-sm text-neutral-600">Sistema de Controle de Ponto</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <span className="badge-success">Sistema Ativo</span>
              <div className="text-xs text-neutral-500 border-l border-neutral-300 pl-4">
                <a 
                  href="https://www.linkedin.com/in/ivanildocandido/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group flex items-center space-x-2 hover:text-primary-600 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-primary-600 group-hover:underline">Ivanildo C. Bezerra</div>
                    <div className="text-[10px]">Analista de Sistemas & Eng. Computação</div>
                  </div>
                  <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navegação Moderna */}
      <nav className="bg-white/60 backdrop-blur-sm border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('upload')}
              className={activeTab === 'upload' ? 'tab-active' : 'tab-inactive'}
            >
              <span className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Upload de Arquivo</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('schedules')}
              className={activeTab === 'schedules' ? 'tab-active' : 'tab-inactive'}
            >
              <span className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Horários de Trabalho</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={activeTab === 'reports' ? 'tab-active' : 'tab-inactive'}
            >
              <span className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Relatórios</span>
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card-hover">
          {activeTab === 'upload' && <FileUpload />}
          {activeTab === 'schedules' && <ScheduleConfig />}
          {activeTab === 'reports' && <ReportsView />}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-white/60 backdrop-blur-sm border-t border-neutral-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-2">
            <p className="text-sm text-neutral-600">
              © {new Date().getFullYear()} Easy Ponto - Sistema de Controle de Ponto
            </p>
            <div className="flex items-center justify-center space-x-2 text-xs text-neutral-500">
              <span>Desenvolvido por</span>
              <a 
                href="https://www.linkedin.com/in/ivanildocandido/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-semibold text-primary-600 hover:text-primary-700 hover:underline transition-colors flex items-center space-x-1"
              >
                <span>Ivanildo Cândido Bezerra</span>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <span className="text-neutral-400">•</span>
              <span>Analista de Sistemas & Engenheiro da Computação</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}





