'use client';

import { useState } from 'react';

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Selecione um arquivo' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: data.message || 'Arquivo processado com sucesso!',
        });
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Erro ao processar arquivo',
        });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao fazer upload do arquivo',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Upload de Arquivo de Ponto</h2>
        <p className="text-neutral-600">Faça upload do arquivo de ponto para processamento automático</p>
      </div>
      
      <div className="space-y-6">
        <div>
          <label
            htmlFor="file-input"
            className="block text-sm font-semibold text-neutral-700 mb-3"
          >
            Selecione o arquivo de ponto (formato TXT)
          </label>
          <div className="relative">
            <input
              id="file-input"
              type="file"
              accept=".txt"
              onChange={handleFileChange}
              className="block w-full text-sm text-neutral-600
                file:mr-4 file:py-3 file:px-6
                file:rounded-xl file:border-0
                file:text-sm file:font-semibold
                file:bg-primary-500 file:text-white
                hover:file:bg-primary-600 file:transition-colors
                file:cursor-pointer cursor-pointer
                input"
            />
          </div>
          {file && (
            <div className="mt-4 p-4 bg-primary-50 border-2 border-primary-200 rounded-xl">
              <p className="text-sm text-neutral-700 flex items-center space-x-2">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Arquivo selecionado: <span className="font-semibold text-primary-700">{file.name}</span></span>
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full btn-primary disabled:bg-neutral-400 disabled:cursor-not-allowed disabled:hover:bg-neutral-400 flex items-center justify-center space-x-2"
        >
          {uploading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Processando...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Fazer Upload e Processar</span>
            </>
          )}
        </button>

        {message && (
          <div
            className={`p-4 rounded-xl border-2 ${
              message.type === 'success'
                ? 'bg-primary-50 text-primary-800 border-primary-200'
                : 'bg-accent-50 text-accent-800 border-accent-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {message.type === 'success' ? (
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        <div className="mt-6 p-6 bg-gradient-to-br from-neutral-50 to-primary-50/50 rounded-2xl border border-neutral-200">
          <h3 className="font-semibold text-neutral-900 mb-3 flex items-center space-x-2">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Formato esperado do arquivo</span>
          </h3>
          <p className="text-sm text-neutral-700 leading-relaxed">
            O arquivo deve ser um arquivo de texto (TXT) com valores separados por tabulação.
            A primeira linha deve conter os cabeçalhos: <code className="bg-white px-2 py-1 rounded text-primary-600 font-mono text-xs">No, TMNo, EnNo, Name, GMNo, Mode, In/Out, VM, Department, DateTime</code>
          </p>
        </div>
      </div>
    </div>
  );
}





