'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, logout, getAccessToken } from '@/lib/auth';
import WidgetContainer from '@/components/widgets/WidgetContainer';
import GenreWidget from '@/components/widgets/GenreWidget';
import DecadeWidget from '@/components/widgets/DecadeWidget';
import PopularityWidget from '@/components/widgets/PopularityWidget';
import ArtistWidget from '@/components/widgets/ArtistWidget';
import TrackWidget from '@/components/widgets/TrackWidget';
import MoodWidget from '@/components/widgets/MoodWidget';
import FavoritesSoup from '@/components/FavoritesSoup';
import PlaylistDisplay from '@/components/PlaylistDisplay';
import { generatePlaylistFromFavorites } from '@/lib/spotify';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Widget selections state
  const [widgetSelections, setWidgetSelections] = useState({
    artists: [],
    tracks: [],
    genres: [],
    decades: [],
    popularity: null,
    mood: null
  });
  
  // Playlist state
  const [playlist, setPlaylist] = useState([]);
  const [generatingPlaylist, setGeneratingPlaylist] = useState(false);
  const [playlistError, setPlaylistError] = useState(null);

  useEffect(() => {
    // Verificar autenticación
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }

    // Obtener perfil del usuario
    const fetchUserProfile = async () => {
      try {
        const token = getAccessToken();
        const response = await fetch('https://api.spotify.com/v1/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Token expired
            logout();
            router.push('/');
            return;
          }
          throw new Error('Error fetching profile');
        }

        const data = await response.json();
        setUser(data);
      } catch (err) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Handle widget selection updates
  const handleWidgetUpdate = (widgetType, value) => {
    setWidgetSelections(prev => ({
      ...prev,
      [widgetType]: value
    }));
  };

  // Generate playlist from favorites
  const handleGeneratePlaylist = async () => {
    setPlaylistError(null);
    setGeneratingPlaylist(true);
    
    try {
      // Get favorites from localStorage
      const stored = localStorage.getItem('spotify_favorites');
      if (!stored) {
        throw new Error('You need at least 5 favorite tracks to generate a playlist');
      }

      const favorites = JSON.parse(stored);
      
      if (favorites.length < 5) {
        setPlaylistError(`You need at least 5 favorite tracks to generate a playlist. You currently have ${favorites.length}.`);
        setGeneratingPlaylist(false);
        return;
      }

      // Generate playlist from favorites
      const tracks = await generatePlaylistFromFavorites(favorites);
      setPlaylist(tracks);
    } catch (err) {
      console.error('Error generating playlist:', err);
      setPlaylistError(err.message || 'Failed to generate playlist. Please try again.');
    } finally {
      setGeneratingPlaylist(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1DB954] mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
          <p className="text-white mb-6">{error}</p>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a0a1a] to-[#0a1a1a] text-white relative overflow-hidden">
      {/* Subtle background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-32 left-16 w-64 h-64 bg-purple-500/8 rounded-full blur-[100px] bg-drift-1"></div>
        <div className="absolute bottom-24 right-20 w-80 h-80 bg-blue-500/6 rounded-full blur-[120px] bg-drift-2"></div>
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-emerald-500/7 rounded-full blur-[110px] bg-drift-3"></div>
      </div>

      {/* Header with glassmorphism */}
      <header className="relative z-10 backdrop-blur-xl bg-black/30 border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#1DB954] flex items-center justify-center text-2xl shadow-lg shadow-[#1DB954]/20">
              🎵
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#1DB954] to-[#1ed760] bg-clip-text text-transparent">
                Taste Mixer
              </h1>
              <p className="text-xs text-gray-400">Your personal playlist studio</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
                {user.images && user.images[0] && (
                  <img
                    src={user.images[0].url}
                    alt={user.display_name || user.id}
                    className="w-8 h-8 rounded-full ring-2 ring-[#1DB954]/50"
                  />
                )}
                <span className="text-sm font-medium text-gray-200">{user.display_name || user.id}</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-all text-sm font-medium"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 p-6 md:p-8 lg:p-12">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-12 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Mix Your Sound
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Craft the perfect playlist by tuning your musical preferences. Each widget shapes your unique sound.
            </p>
          </div>

          {/* Widgets Section with creative layout */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#1DB954]/50 to-transparent"></div>
              <h3 className="text-xl font-semibold text-gray-300 px-4">Your Preferences</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#1DB954]/50 to-transparent"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
              <div className="md:col-span-2 lg:col-span-1">
                <ArtistWidget
                  selectedArtists={widgetSelections.artists}
                  onSelect={(artists) => handleWidgetUpdate('artists', artists)}
                />
              </div>
              
              <div>
                <GenreWidget
                  selectedGenres={widgetSelections.genres}
                  onSelect={(genres) => handleWidgetUpdate('genres', genres)}
                />
              </div>
              
              <div>
                <DecadeWidget
                  selectedDecades={widgetSelections.decades}
                  onSelect={(decades) => handleWidgetUpdate('decades', decades)}
                />
              </div>
              
              <div>
                <PopularityWidget
                  popularity={widgetSelections.popularity}
                  onSelect={(popularity) => handleWidgetUpdate('popularity', popularity)}
                />
              </div>
              
              <div>
                <TrackWidget
                  selectedTracks={widgetSelections.tracks}
                  onSelect={(tracks) => handleWidgetUpdate('tracks', tracks)}
                />
              </div>
              
              <div>
                <MoodWidget
                  mood={widgetSelections.mood}
                  onSelect={(mood) => handleWidgetUpdate('mood', mood)}
                />
              </div>
            </div>
          </div>

          {/* Favorites Network Visualization */}
          <div className="mb-10">
            <FavoritesSoup />
          </div>

          {/* Generate Playlist Button - More prominent */}
          <div className="mb-10 flex flex-col items-center gap-4">
            <button
              onClick={handleGeneratePlaylist}
              disabled={generatingPlaylist}
              className="group relative px-12 py-4 bg-[#1DB954] hover:bg-[#1ed760] disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-full text-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-[#1DB954]/30 hover:scale-[1.02] disabled:hover:scale-100"
            >
              <span className="relative z-10 flex items-center gap-3">
                {generatingPlaylist ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Mixing Your Sound...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Playlist from Favorites</span>
                    <span className="text-lg group-hover:translate-x-0.5 transition-transform duration-200">→</span>
                  </>
                )}
              </span>
            </button>
            
            {/* Error message */}
            {playlistError && (
              <div className="px-6 py-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm max-w-md text-center">
                <p className="font-medium mb-1">⚠️ Cannot Generate Playlist</p>
                <p>{playlistError}</p>
              </div>
            )}
          </div>

          {/* Playlist Display Section */}
          <div className="relative">
            <div className="relative backdrop-blur-sm bg-black/30 border border-white/10 rounded-2xl p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-8 bg-gradient-to-b from-[#1DB954] to-[#1ed760] rounded-full"></div>
                <h2 className="text-2xl font-bold">Your Playlist</h2>
              </div>
              
              {playlist.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-[#1DB954]/20 to-[#1ed760]/20 mb-6">
                    <span className="text-5xl">🎧</span>
                  </div>
                  <p className="text-gray-300 text-lg font-medium mb-2">No playlist yet</p>
                  <p className="text-sm text-gray-500 max-w-md mx-auto">
                    Configure your preferences above and hit generate to create your personalized mix
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-gray-300 font-medium">
                      <span className="text-[#1DB954]">{playlist.length}</span> tracks ready
                    </p>
                    <button
                      onClick={() => setPlaylist([])}
                      className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                    >
                      Clear Playlist
                    </button>
                  </div>
                  <PlaylistDisplay
                    tracks={playlist}
                    onRemoveTrack={(trackId) => {
                      setPlaylist(playlist.filter(t => t.id !== trackId));
                    }}
                    onReorderTracks={(newTracks) => {
                      setPlaylist(newTracks);
                    }}
                    onAddTrack={(track) => {
                      if (!playlist.find(t => t.id === track.id)) {
                        setPlaylist([...playlist, track]);
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

