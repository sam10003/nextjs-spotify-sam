'use client';

import { useState, useEffect } from 'react';
import WidgetContainer from './WidgetContainer';
import { fetchPopularityPreviewTracks } from '@/lib/spotify';
import TrackPopup from '../TrackPopup';

const POPULARITY_CATEGORIES = [
  { label: 'Mainstream', min: 80, max: 100, color: 'from-yellow-500/20 to-yellow-600/20' },
  { label: 'Popular', min: 50, max: 80, color: 'from-blue-500/20 to-blue-600/20' },
  { label: 'Underground', min: 0, max: 50, color: 'from-purple-500/20 to-purple-600/20' },
];

export default function PopularityWidget({ popularity = null, onSelect }) {
  const [minValue, setMinValue] = useState(popularity ? popularity[0] : 0);
  const [maxValue, setMaxValue] = useState(popularity ? popularity[1] : 100);
  const [previewTracks, setPreviewTracks] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [showCustomRange, setShowCustomRange] = useState(false);

  useEffect(() => {
    if (popularity) {
      setMinValue(popularity[0]);
      setMaxValue(popularity[1]);
    }
  }, [popularity]);

  // Fetch preview tracks when popularity is set (reset offset)
  useEffect(() => {
    const loadPreviewTracks = async () => {
      if (popularity && popularity.length === 2) {
        setOffset(0); // Reset offset when selection changes
        setLoadingPreview(true);
        try {
          const tracks = await fetchPopularityPreviewTracks(popularity, 8, 0);
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
  }, [popularity]);

  const handleLoadMore = async () => {
    if (!popularity || popularity.length !== 2) return;
    setLoadingPreview(true);
    try {
      // Increment offset to get next batch
      const newOffset = offset + 50; // Larger increment for popularity since we filter
      setOffset(newOffset);
      const tracks = await fetchPopularityPreviewTracks(popularity, 8, newOffset);
      setPreviewTracks(tracks);
    } catch (error) {
      console.error('Error loading more tracks:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleRangeChange = (e) => {
    const center = parseInt(e.target.value);
    const range = 20; // Fixed range width
    const newMin = Math.max(0, center - range / 2);
    const newMax = Math.min(100, center + range / 2);
    setMinValue(Math.floor(newMin));
    setMaxValue(Math.ceil(newMax));
    onSelect([Math.floor(newMin), Math.ceil(newMax)]);
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

  const handleCategoryClick = (category) => {
    setMinValue(category.min);
    setMaxValue(category.max);
    setShowCustomRange(false);
    onSelect([category.min, category.max]);
  };

  const getCurrentCategory = () => {
    return POPULARITY_CATEGORIES.find(
      cat => minValue >= cat.min && maxValue <= cat.max
    );
  };

  const clearSelection = () => {
    setMinValue(0);
    setMaxValue(100);
    onSelect(null);
  };

  return (
    <WidgetContainer title="Popularity" icon="📊">
      <div className="space-y-4">
        {/* Category buttons */}
        <div className="grid grid-cols-3 gap-2">
          {POPULARITY_CATEGORIES.map((category) => {
            const isActive = minValue >= category.min && maxValue <= category.max && !showCustomRange;
            return (
              <button
                key={category.label}
                onClick={() => handleCategoryClick(category)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? `bg-gradient-to-br ${category.color} border-2 border-white/30 text-white`
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>

        {/* Custom Range Toggle */}
        <button
          onClick={() => {
            setShowCustomRange(!showCustomRange);
            if (!showCustomRange) {
              // Set to middle range when enabling custom
              const center = 50;
              setMinValue(40);
              setMaxValue(60);
              onSelect([40, 60]);
            }
          }}
          className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            showCustomRange
              ? 'bg-[#1DB954]/20 text-[#1DB954] border-2 border-[#1DB954]/50'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          {showCustomRange ? '✓ Custom Range' : 'Custom Range'}
        </button>

        {/* Custom Range Slider */}
        {showCustomRange && (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-400">Range: {minValue} - {maxValue}</span>
              <span className="text-xs text-gray-400">Center: {Math.round((minValue + maxValue) / 2)}</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              value={Math.round((minValue + maxValue) / 2)}
              onChange={handleRangeChange}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#1DB954]"
            />
            <div className="relative h-2 bg-white/10 rounded-lg overflow-hidden">
              <div
                className="absolute h-full bg-[#1DB954] rounded-lg"
                style={{
                  left: `${minValue}%`,
                  width: `${maxValue - minValue}%`
                }}
              />
            </div>
          </div>
        )}

        {/* Current selection */}
        {popularity && (
          <div className="flex items-center justify-between px-3 py-2 bg-[#1DB954]/10 border border-[#1DB954]/30 rounded-lg">
            <span className="text-sm text-[#1DB954]">
              {minValue} - {maxValue}
            </span>
            <button
              onClick={clearSelection}
              className="text-xs text-gray-400 hover:text-red-400 transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        {/* Preview Tracks */}
        {popularity && popularity.length === 2 && (
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

