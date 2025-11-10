'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { saveTokens } from '@/lib/auth';

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState(null);
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevenir ejecución duplicada
    if (hasProcessed.current) return;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('Autenticación cancelada');
      return;
    }

    if (!code) {
      setError('No se recibió código de autorización');
      return;
    }

    // Validar state para prevenir CSRF
    const savedState = sessionStorage.getItem('spotify_auth_state');
    if (!state || state !== savedState) {
      setError('Error de validación de seguridad (CSRF). Intenta iniciar sesión de nuevo.');
      sessionStorage.removeItem('spotify_auth_state');
      return;
    }

    // Limpiar state después de validar
    sessionStorage.removeItem('spotify_auth_state');

    // Marcar como procesado
    hasProcessed.current = true;

    // Intercambiar código por token
    const exchangeCodeForToken = async (code) => {
      try {
        const response = await fetch('/api/spotify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error al obtener token');
        }

        // Guardar tokens
        saveTokens(data.access_token, data.refresh_token, data.expires_in);

        // Redirigir al dashboard
        router.push('/dashboard');

      } catch (error) {
        console.error('Error:', error);
        setError(error.message);
      }
    };

    exchangeCodeForToken(code);
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
          <p className="text-white mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
        <p className="text-white text-xl">Autenticando...</p>
      </div>
    </div>
  );
}