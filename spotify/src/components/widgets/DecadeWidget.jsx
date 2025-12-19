'use client';

import { useState, useEffect } from 'react';
import WidgetContainer from './WidgetContainer';
import { fetchDecadePreviewTracks } from '@/lib/spotify';
import TrackPopup from '../TrackPopup';

const DECADES = [
  { label: '1950s', start: 1950 },
  { label: '1960s', start: 1960 },
  { label: '1970s', start: 1970 },
  { label: '1980s', start: 1980 },
  { label: '1990s', start: 1990 },
  { label: '2000s', start: 2000 },
  { label: '2010s', start: 2010 },
  { label: '2020s', start: 2020 },
];

const MAX_SELECTIONS = 3;

export default function DecadeWidget({ selectedDecades = [], onSelect }) {
  const [previewTracks, setPreviewTracks] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState(null);

  // Fetch preview tracks when decades are selected (reset offset)
  useEffect(() => {
    const loadPreviewTracks = async () => {
      if (selectedDecades.length > 0) {
        setOffset(0); // Reset offset when selections change
        setLoadingPreview(true);
        try {
          const tracks = await fetchDecadePreviewTracks(selectedDecades, 8, 0);
          setPreviewTracks(tracks);
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
  }, [selectedDecades]);

  const handleLoadMore = async () => {
    if (selectedDecades.length === 0) return;
    setLoadingPreview(true);
    try {
      // Increment offset to get next batch
      const newOffset = offset + 8;
      setOffset(newOffset);
      const tracks = await fetchDecadePreviewTracks(selectedDecades, 8, newOffset);
      setPreviewTracks(tracks);
    } catch (error) {
      console.error('Error loading more tracks:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleFavorite = (track) => {
    // Store favorite in localStorage
    const favorites = JSON.parse(localStorage.getItem('spotify_favorites') || '[]');
    if (!favorites.find(f => f.id === track.id)) {
      favorites.push(track);
      localStorage.setItem('spotify_favorites', JSON.stringify(favorites));
    }
    setSelectedTrack(null);
  };

  const handleToggleDecade = (decadeStart) => {
    if (selectedDecades.includes(decadeStart)) {
      // Remove decade
      onSelect(selectedDecades.filter(d => d !== decadeStart));
    } else {
      // Add decade (with limit)
      if (selectedDecades.length < MAX_SELECTIONS) {
        onSelect([...selectedDecades, decadeStart]);
      }
    }
  };

  const handleRemoveDecade = (decadeStart) => {
    onSelect(selectedDecades.filter(d => d !== decadeStart));
  };

  const getDecadeLabel = (start) => {
    return DECADES.find(d => d.start === start)?.label || `${start}s`;
  };

  return (
    <WidgetContainer title="Decades" icon="📅">
      <div className="space-y-4">
        {/* Selected decades */}
        {selectedDecades.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedDecades.map((decadeStart) => (
              <span
                key={decadeStart}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1DB954]/20 text-[#1DB954] rounded-full text-xs font-medium border border-[#1DB954]/30"
              >
                {getDecadeLabel(decadeStart)}
                <button
                  onClick={() => handleRemoveDecade(decadeStart)}
                  className="hover:text-red-400 transition-colors"
                  aria-label={`Remove ${getDecadeLabel(decadeStart)}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Decade grid */}
        <div className="grid grid-cols-2 gap-2">
          {DECADES.map((decade) => {
            const isSelected = selectedDecades.includes(decade.start);
            const isDisabled = !isSelected && selectedDecades.length >= MAX_SELECTIONS;
            
            return (
              <button
                key={decade.start}
                onClick={() => handleToggleDecade(decade.start)}
                disabled={isDisabled}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-[#1DB954]/20 text-[#1DB954] border-2 border-[#1DB954]/50'
                    : isDisabled
                    ? 'bg-white/5 text-gray-600 border border-white/10 cursor-not-allowed'
                    : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:border-[#1DB954]/30 hover:text-white'
                }`}
              >
                {decade.label}
                {isSelected && <span className="ml-2 text-[#1DB954]">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Selection limit indicator */}
        <p className="text-xs text-gray-500 text-center">
          {selectedDecades.length} / {MAX_SELECTIONS} selected
        </p>

        {/* Preview Tracks */}
        {selectedDecades.length > 0 && (
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

