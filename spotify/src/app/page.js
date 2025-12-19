'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getSpotifyAuthUrl } from '@/lib/auth';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // If already authenticated, redirect to dashboard
    if (isAuthenticated()) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleLogin = () => {
    const authUrl = getSpotifyAuthUrl();
    if (authUrl && authUrl !== '#') {
      window.location.href = authUrl;
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-5xl font-bold text-white mb-4">
          🎵 Spotify Taste Mixer
        </h1>
        <p className="text-gray-400 text-lg mb-8">
          Generate personalized playlists based on your musical preferences
        </p>
        
        <button
          onClick={handleLogin}
          className="bg-[#1DB954] hover:bg-[#1ed760] text-white font-bold py-4 px-8 rounded-full text-lg transition-colors duration-200 shadow-lg"
        >
          Log in with Spotify
        </button>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>🔒 Secure OAuth 2.0 authentication</p>
          <p className="mt-2 text-xs">You'll be redirected to Spotify to authorize this application</p>
        </div>
      </div>
    </div>
  );
}


