'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function TrackPopup({ track, isOpen, onClose, onFavorite }) {
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Check if track is already favorited
      const favorites = JSON.parse(localStorage.getItem('spotify_favorites') || '[]');
      setIsFavorited(favorites.some(f => f.id === track?.id));
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, track]);

  if (!isOpen || !track) return null;

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getPopularityColor = (popularity) => {
    if (popularity >= 70) return 'text-green-400';
    if (popularity >= 40) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getPopularityLabel = (popularity) => {
    if (popularity >= 80) return 'Very Popular';
    if (popularity >= 60) return 'Popular';
    if (popularity >= 40) return 'Moderate';
    if (popularity >= 20) return 'Niche';
    return 'Underground';
  };

  const handleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('spotify_favorites') || '[]');
    
    if (isFavorited) {
      // Remove from favorites
      const updated = favorites.filter(f => f.id !== track.id);
      localStorage.setItem('spotify_favorites', JSON.stringify(updated));
      setIsFavorited(false);
    } else {
      // Add to favorites
      if (!favorites.find(f => f.id === track.id)) {
        favorites.push(track);
        localStorage.setItem('spotify_favorites', JSON.stringify(favorites));
        setIsFavorited(true);
      }
    }
    
    onFavorite(track);
  };

  const popupContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, padding: '2rem' }}
    >
      <div
        className="bg-[#181818] rounded-2xl max-w-md w-full max-h-[90vh] border border-white/10 shadow-2xl overflow-y-auto custom-scrollbar animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
        style={{ marginTop: 'auto', marginBottom: 'auto' }}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-bold text-white">Track Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Track content */}
        <div className="p-6">
          {/* Album cover */}
          <div className="flex justify-center mb-6">
            {track.album?.images?.[0]?.url ? (
              <img
                src={track.album.images[0].url}
                alt={track.album.name}
                className="w-48 h-48 rounded-lg shadow-xl object-cover"
              />
            ) : (
              <div className="w-48 h-48 rounded-lg bg-white/5 flex items-center justify-center text-6xl">
                🎵
              </div>
            )}
          </div>

          {/* Track info */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">{track.name}</h2>
            <p className="text-gray-400 mb-1">
              {track.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}
            </p>
            <p className="text-sm text-gray-500">{track.album?.name || 'Unknown Album'}</p>
          </div>

          {/* Track details */}
          <div className="space-y-2 mb-6">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-gray-400 flex items-center gap-2">
                <span>⏱️</span> Duration
              </span>
              <span className="text-white font-medium">{formatDuration(track.duration_ms || 0)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-gray-400 flex items-center gap-2">
                <span>📊</span> Popularity
              </span>
              <div className="flex items-center gap-2">
                <span className={`font-medium ${getPopularityColor(track.popularity || 0)}`}>
                  {track.popularity || 0}/100
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full bg-white/10 ${getPopularityColor(track.popularity || 0)}`}>
                  {getPopularityLabel(track.popularity || 0)}
                </span>
              </div>
            </div>

            {track.album?.release_date && (
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-gray-400 flex items-center gap-2">
                  <span>📅</span> Release Date
                </span>
                <span className="text-white font-medium">{formatDate(track.album.release_date)}</span>
              </div>
            )}

            {track.album && (
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-gray-400 flex items-center gap-2">
                  <span>💿</span> Album Type
                </span>
                <span className="text-white font-medium capitalize">{track.album.album_type || 'Album'}</span>
              </div>
            )}

            {track.track_number && track.album?.total_tracks && (
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-gray-400 flex items-center gap-2">
                  <span>🎵</span> Track Number
                </span>
                <span className="text-white font-medium">
                  {track.track_number} of {track.album.total_tracks}
                </span>
              </div>
            )}

            {track.explicit !== undefined && (
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-gray-400 flex items-center gap-2">
                  <span>⚠️</span> Explicit
                </span>
                <span className={`text-sm font-medium ${track.explicit ? 'text-red-400' : 'text-gray-500'}`}>
                  {track.explicit ? 'Yes' : 'No'}
                </span>
              </div>
            )}

            {track.external_urls?.spotify && (
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-400 flex items-center gap-2">
                  <span>🔗</span> Spotify Link
                </span>
                <a
                  href={track.external_urls.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1DB954] hover:text-[#1ed760] text-sm font-medium transition-colors flex items-center gap-1"
                >
                  Open
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
          </div>

          {/* Favorite button */}
          <button
            onClick={handleFavorite}
            className={`w-full font-bold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 ${
              isFavorited
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                : 'bg-[#1DB954] hover:bg-[#1ed760] text-white'
            }`}
          >
            <span className="text-xl">{isFavorited ? '🗑️' : '⭐'}</span>
            <span>{isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Use portal to render outside widget hierarchy
  if (typeof window !== 'undefined') {
    return createPortal(popupContent, document.body);
  }
  
  return null;
}

