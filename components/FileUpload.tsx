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
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Upload de Arquivo de Ponto</h2>
      
      <div className="space-y-4">
        <div>
          <label
            htmlFor="file-input"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Selecione o arquivo de ponto (formato TXT)
          </label>
          <input
            id="file-input"
            type="file"
            accept=".txt"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              Arquivo selecionado: <span className="font-medium">{file.name}</span>
            </p>
          )}
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700
            disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {uploading ? 'Processando...' : 'Fazer Upload e Processar'}
        </button>

        {message && (
          <div
            className={`p-4 rounded-md ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h3 className="font-medium text-gray-900 mb-2">Formato esperado do arquivo:</h3>
          <p className="text-sm text-gray-600">
            O arquivo deve ser um arquivo de texto (TXT) com valores separados por tabulação.
            A primeira linha deve conter os cabeçalhos: No, TMNo, EnNo, Name, GMNo, Mode, In/Out, VM, Department, DateTime
          </p>
        </div>
      </div>
    </div>
  );
}





