'use client';

import { useState, useEffect, useRef } from 'react';
import WidgetContainer from './WidgetContainer';
import { getAccessToken } from '@/lib/auth';
import TrackPopup from '../TrackPopup';

const MAX_SELECTIONS = 5;

export default function ArtistWidget({ selectedArtists = [], onSelect }) {
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
          `https://api.spotify.com/v1/search?type=artist&q=${encodeURIComponent(searchQuery)}&limit=10`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.artists?.items || []);
        }
      } catch (error) {
        console.error('Error searching artists:', error);
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
  }, [searchQuery]);

  // Fetch preview tracks when artists are selected
  useEffect(() => {
    const loadPreviewTracks = async () => {
      if (selectedArtists.length > 0) {
        setOffset(0);
        setLoadingPreview(true);
        try {
          const token = getAccessToken();
          if (!token) return;

          const allTracks = [];
          for (const artist of selectedArtists.slice(0, 2)) {
            try {
              const response = await fetch(
                `https://api.spotify.com/v1/artists/${artist.id}/top-tracks?market=US`,
                {
                  headers: { 'Authorization': `Bearer ${token}` }
                }
              );

              if (response.ok) {
                const data = await response.json();
                if (data.tracks) {
                  allTracks.push(...data.tracks);
                }
              }
            } catch (error) {
              console.error(`Error fetching tracks for artist ${artist.name}:`, error);
            }
          }

          const uniqueTracks = Array.from(
            new Map(allTracks.map(track => [track.id, track])).values()
          );
          const shuffled = uniqueTracks.sort(() => Math.random() - 0.5);
          setPreviewTracks(shuffled.slice(0, 8));
        } catch (error) {
          console.error('Error loading preview tracks:', error);
          setPreviewTracks([]);
        } finally {
          setLoadingPreview(false);
        }
      } else {
        setPreviewTracks([]);
        setOffset(0);
      }
    };

    loadPreviewTracks();
  }, [selectedArtists]);

  const handleLoadMore = async () => {
    if (selectedArtists.length === 0) return;
    setLoadingPreview(true);
    try {
      const token = getAccessToken();
      if (!token) return;

      const allTracks = [];
      for (const artist of selectedArtists.slice(0, 2)) {
        try {
          // For top tracks, we can't use offset, so we'll fetch again and shuffle differently
          const response = await fetch(
            `https://api.spotify.com/v1/artists/${artist.id}/top-tracks?market=US`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.tracks) {
              allTracks.push(...data.tracks);
            }
          }
        } catch (error) {
          console.error(`Error fetching tracks for artist ${artist.name}:`, error);
        }
      }

      const uniqueTracks = Array.from(
        new Map(allTracks.map(track => [track.id, track])).values()
      );
      // Different shuffle seed based on offset
      const shuffled = uniqueTracks.sort(() => Math.random() - 0.5);
      setPreviewTracks(shuffled.slice(0, 8));
      setOffset(prev => prev + 1);
    } catch (error) {
      console.error('Error loading more tracks:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleToggleArtist = (artist) => {
    if (selectedArtists.find(a => a.id === artist.id)) {
      onSelect(selectedArtists.filter(a => a.id !== artist.id));
    } else {
      if (selectedArtists.length < MAX_SELECTIONS) {
        onSelect([...selectedArtists, artist]);
      }
    }
  };

  const handleRemoveArtist = (artistId) => {
    onSelect(selectedArtists.filter(a => a.id !== artistId));
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
    <WidgetContainer title="Artists" icon="🎤">
      <div className="space-y-4">
        {/* Search input */}
        <input
          type="text"
          placeholder="Search artists..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#1DB954]/50 transition-colors text-sm"
        />

        {/* Selected artists */}
        {selectedArtists.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedArtists.map((artist) => (
              <span
                key={artist.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1DB954]/20 text-[#1DB954] rounded-full text-xs font-medium border border-[#1DB954]/30"
              >
                {artist.name}
                <button
                  onClick={() => handleRemoveArtist(artist.id)}
                  className="hover:text-red-400 transition-colors"
                  aria-label={`Remove ${artist.name}`}
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
              <p className="text-sm text-gray-500 text-center py-4">No artists found</p>
            ) : (
              searchResults.map((artist) => {
                const isSelected = selectedArtists.find(a => a.id === artist.id);
                const isDisabled = !isSelected && selectedArtists.length >= MAX_SELECTIONS;
                
                return (
                  <button
                    key={artist.id}
                    onClick={() => handleToggleArtist(artist)}
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
                      {artist.images?.[2]?.url ? (
                        <img
                          src={artist.images[2].url}
                          alt={artist.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-lg">
                          🎤
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{artist.name}</p>
                        {artist.genres && artist.genres.length > 0 && (
                          <p className="text-xs text-gray-500">{artist.genres.slice(0, 2).join(', ')}</p>
                        )}
                      </div>
                      {isSelected && <span className="text-[#1DB954]">✓</span>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Selection limit indicator */}
        {selectedArtists.length > 0 && (
          <p className="text-xs text-gray-500 text-center">
            {selectedArtists.length} / {MAX_SELECTIONS} selected
          </p>
        )}

        {/* Preview Tracks */}
        {selectedArtists.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-400">Preview Tracks</p>
              <button
                onClick={handleLoadMore}
                disabled={loadingPreview}
                className="text-xs text-[#1DB954] hover:text-[#1ed760] disabled:text-gray-600 transition-colors"
              >
                {loadingPreview ? 'Loading...' : 'New Batch'}
              </button>
            </div>
            
            {loadingPreview && previewTracks.length === 0 ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#1DB954] border-t-transparent"></div>
              </div>
            ) : previewTracks.length > 0 ? (
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
              <p className="text-xs text-gray-500 text-center py-2">No preview available</p>
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

