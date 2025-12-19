'use client';

import { useState, useEffect, useRef } from 'react';
import TrackPopup from './TrackPopup';
import { getAccessToken } from '@/lib/auth';

export default function PlaylistDisplay({ tracks, onRemoveTrack, onReorderTracks, onAddTrack }) {
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const searchTimeoutRef = useRef(null);

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleFavorite = (track) => {
    const favorites = JSON.parse(localStorage.getItem('spotify_favorites') || '[]');
    if (!favorites.find(f => f.id === track.id)) {
      favorites.push(track);
      localStorage.setItem('spotify_favorites', JSON.stringify(favorites));
    }
    setSelectedTrack(null);
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target);
    e.target.style.opacity = '0.5';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    const newTracks = [...tracks];
    const draggedTrack = newTracks[draggedIndex];
    newTracks.splice(draggedIndex, 1);
    newTracks.splice(dropIndex, 0, draggedTrack);
    
    onReorderTracks(newTracks);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

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
      setSearching(true);
      try {
        const token = getAccessToken();
        if (!token) {
          setSearchResults([]);
          return;
        }

        const response = await fetch(
          `https://api.spotify.com/v1/search?type=track&q=${encodeURIComponent(searchQuery)}&limit=10`,
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
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleAddTrack = (track) => {
    // Check if track already exists in playlist
    if (tracks.find(t => t.id === track.id)) {
      return;
    }
    onAddTrack(track);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  if (tracks.length === 0 && !showSearch) {
    return null;
  }

  return (
    <>
      <div className="space-y-2">
        {tracks.map((track, index) => (
          <div
            key={track.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            onDrop={(e) => handleDrop(e, index)}
            className={`flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group cursor-move ${
              draggedIndex === index ? 'opacity-50' : ''
            } ${
              dragOverIndex === index ? 'border-2 border-[#1DB954] bg-[#1DB954]/10' : ''
            }`}
          >
            {/* Drag handle */}
            <div className="flex-shrink-0 text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>

            <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-white/5">
              {track.album?.images?.[2]?.url ? (
                <img
                  src={track.album.images[2].url}
                  alt={track.album.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl">
                  🎵
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p
                className="font-medium text-white truncate cursor-pointer hover:text-[#1DB954] transition-colors"
                onClick={() => setSelectedTrack(track)}
              >
                {track.name}
              </p>
              <p className="text-sm text-gray-400 truncate">
                {track.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 w-12 text-right">
                {formatDuration(track.duration_ms || 0)}
              </span>
              <button
                onClick={() => onRemoveTrack(track.id)}
                className="text-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                aria-label="Remove track"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        {/* Add Song Button */}
        <div className="mt-4 pt-4 border-t border-white/10">
          {!showSearch ? (
            <button
              onClick={() => setShowSearch(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 rounded-lg text-gray-300 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Song to Playlist</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search for a song..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#1DB954]/50 transition-colors text-sm"
                />
                {searching && (
                  <div className="flex items-center px-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#1DB954] border-t-transparent"></div>
                  </div>
                )}
                <button
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
                  {searchResults.map((track) => {
                    const isInPlaylist = tracks.find(t => t.id === track.id);
                    return (
                      <div
                        key={track.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded overflow-hidden bg-white/5">
                          {track.album?.images?.[2]?.url ? (
                            <img
                              src={track.album.images[2].url}
                              alt={track.album.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm">
                              🎵
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate text-sm">{track.name}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {track.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAddTrack(track)}
                          disabled={isInPlaylist}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            isInPlaylist
                              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                              : 'bg-[#1DB954] hover:bg-[#1ed760] text-white'
                          }`}
                        >
                          {isInPlaylist ? 'Added' : 'Add'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Track Popup */}
      <TrackPopup
        track={selectedTrack}
        isOpen={!!selectedTrack}
        onClose={() => setSelectedTrack(null)}
        onFavorite={handleFavorite}
      />
    </>
  );
}

