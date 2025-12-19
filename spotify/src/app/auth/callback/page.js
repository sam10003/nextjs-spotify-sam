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
      setError('Authentication cancelled');
      return;
    }

    if (!code) {
      setError('Authorization code not received');
      return;
    }

    // Validar state para prevenir CSRF
    const savedState = sessionStorage.getItem('spotify_auth_state');
    
    // Debug: show validation information
    console.log('🔍 Validating CSRF state...');
    console.log('State received from Spotify:', state ? state.substring(0, 8) + '...' : 'null');
    console.log('Saved state:', savedState ? savedState.substring(0, 8) + '...' : 'null');
    
    if (!state) {
      console.error('No state received in URL');
      setError('Error: Security parameter not received. Please try logging in again.');
      sessionStorage.removeItem('spotify_auth_state');
      return;
    }
    
    if (!savedState) {
      console.error('No saved state found in sessionStorage');
      setError('Error: Session expired. Please try logging in again.');
      return;
    }
    
    if (state !== savedState) {
      console.error('State mismatch!');
      console.error('Received:', state);
      console.error('Expected:', savedState);
      setError('Security validation error (CSRF). Please try logging in again.');
      sessionStorage.removeItem('spotify_auth_state');
      return;
    }
    
    console.log('CSRF validation successful');

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
          throw new Error(data.error || 'Error obtaining token');
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
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
        <p className="text-white text-xl">Authenticating...</p>
      </div>
    </div>
  );
}