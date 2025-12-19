'use client';

import { useState, useEffect, useRef } from 'react';
import WidgetContainer from './WidgetContainer';
import { getAccessToken } from '@/lib/auth';
import TrackPopup from '../TrackPopup';

const MAX_SELECTIONS = 10;

export default function TrackWidget({ selectedTracks = [], onSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [previewTracks, setPreviewTracks] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const searchTimeoutRef = useRef(null);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const token = getAccessToken();
        if (!token) return;

        const response = await fetch(
          `https://api.spotify.com/v1/search?type=track&q=${encodeURIComponent(searchQuery)}&limit=10&offset=${offset}`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.tracks?.items || []);
        }
      } catch (error) {
        console.error('Error searching tracks:', error);
        setSearchResults([]);
      } finally {
        setLoadingSearch(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, offset]);

  // Show preview tracks from selected tracks
  useEffect(() => {
    if (selectedTracks.length > 0) {
      setPreviewTracks(selectedTracks.slice(0, 8));
    } else {
      setPreviewTracks([]);
    }
  }, [selectedTracks]);

  const handleLoadMore = () => {
    setOffset(prev => prev + 10);
  };

  const handleToggleTrack = (track) => {
    if (selectedTracks.find(t => t.id === track.id)) {
      onSelect(selectedTracks.filter(t => t.id !== track.id));
    } else {
      if (selectedTracks.length < MAX_SELECTIONS) {
        onSelect([...selectedTracks, track]);
      }
    }
  };

  const handleRemoveTrack = (trackId) => {
    onSelect(selectedTracks.filter(t => t.id !== trackId));
  };

  const handleFavorite = (track) => {
    const favorites = JSON.parse(localStorage.getItem('spotify_favorites') || '[]');
    if (!favorites.find(f => f.id === track.id)) {
      favorites.push(track);
      localStorage.setItem('spotify_favorites', JSON.stringify(favorites));
    }
    setSelectedTrack(null);
  };

  return (
    <WidgetContainer title="Tracks" icon="🎵">
      <div className="space-y-4">
        {/* Search input */}
        <input
          type="text"
          placeholder="Search tracks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#1DB954]/50 transition-colors text-sm"
        />

        {/* Selected tracks */}
        {selectedTracks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedTracks.map((track) => (
              <span
                key={track.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1DB954]/20 text-[#1DB954] rounded-full text-xs font-medium border border-[#1DB954]/30 max-w-[200px] truncate"
                title={track.name}
              >
                {track.name}
                <button
                  onClick={() => handleRemoveTrack(track.id)}
                  className="hover:text-red-400 transition-colors"
                  aria-label={`Remove ${track.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search results */}
        {searchQuery && (
          <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
            {loadingSearch ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#1DB954] border-t-transparent"></div>
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No tracks found</p>
            ) : (
              <>
                {searchResults.map((track) => {
                  const isSelected = selectedTracks.find(t => t.id === track.id);
                  const isDisabled = !isSelected && selectedTracks.length >= MAX_SELECTIONS;
                  
                  return (
                    <button
                      key={track.id}
                      onClick={() => handleToggleTrack(track)}
                      disabled={isDisabled}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                        isSelected
                          ? 'bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/30'
                          : isDisabled
                          ? 'text-gray-600 cursor-not-allowed'
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {track.album?.images?.[2]?.url ? (
                          <img
                            src={track.album.images[2].url}
                            alt={track.album.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center text-lg">
                            🎵
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{track.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {track.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}
                          </p>
                        </div>
                        {isSelected && <span className="text-[#1DB954]">✓</span>}
                      </div>
                    </button>
                  );
                })}
                <button
                  onClick={handleLoadMore}
                  className="w-full px-3 py-2 text-sm text-[#1DB954] hover:text-[#1ed760] transition-colors"
                >
                  Load more results...
                </button>
              </>
            )}
          </div>
        )}

        {/* Selection limit indicator */}
        {selectedTracks.length > 0 && (
          <p className="text-xs text-gray-500 text-center">
            {selectedTracks.length} / {MAX_SELECTIONS} selected
          </p>
        )}

        {/* Preview Tracks */}
        {selectedTracks.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-400">Selected Tracks</p>
            </div>
            
            {previewTracks.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {previewTracks.map((track) => (
                  <div
                    key={track.id}
                    onClick={() => setSelectedTrack(track)}
                    className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-white/5 group cursor-pointer hover:scale-105 transition-transform"
                    title={`${track.name} - ${track.artists.map(a => a.name).join(', ')}`}
                  >
                    {track.album?.images?.[2]?.url ? (
                      <img
                        src={track.album.images[2].url}
                        alt={track.album.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        🎵
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center py-2">No tracks selected</p>
            )}
          </div>
        )}

        {/* Track Popup */}
        <TrackPopup
          track={selectedTrack}
          isOpen={!!selectedTrack}
          onClose={() => setSelectedTrack(null)}
          onFavorite={handleFavorite}
        />
      </div>
    </WidgetContainer>
  );
}

