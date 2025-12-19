'use client';

import { useState, useEffect } from 'react';
import WidgetContainer from './WidgetContainer';
import { getAccessToken } from '@/lib/auth';
import TrackPopup from '../TrackPopup';

const MOOD_PRESETS = [
  { label: 'Happy', energy: 0.7, valence: 0.8, danceability: 0.7, color: 'from-yellow-500/20 to-orange-500/20' },
  { label: 'Sad', energy: 0.3, valence: 0.2, danceability: 0.3, color: 'from-blue-500/20 to-indigo-500/20' },
  { label: 'Energetic', energy: 0.9, valence: 0.7, danceability: 0.9, color: 'from-red-500/20 to-pink-500/20' },
  { label: 'Calm', energy: 0.2, valence: 0.5, danceability: 0.3, color: 'from-green-500/20 to-teal-500/20' },
  { label: 'Party', energy: 0.95, valence: 0.85, danceability: 0.95, color: 'from-purple-500/20 to-pink-500/20' },
  { label: 'Chill', energy: 0.4, valence: 0.6, danceability: 0.5, color: 'from-cyan-500/20 to-blue-500/20' },
];

export default function MoodWidget({ mood = null, onSelect }) {
  const [energy, setEnergy] = useState(mood?.energy ?? 0.5);
  const [valence, setValence] = useState(mood?.valence ?? 0.5);
  const [danceability, setDanceability] = useState(mood?.danceability ?? 0.5);
  const [previewTracks, setPreviewTracks] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [useCustom, setUseCustom] = useState(false);

  useEffect(() => {
    if (mood) {
      setEnergy(mood.energy);
      setValence(mood.valence);
      setDanceability(mood.danceability);
      setUseCustom(true);
    }
  }, [mood]);

  // Fetch preview tracks when mood is set
  useEffect(() => {
    const loadPreviewTracks = async () => {
      if (mood && (mood.energy !== undefined || mood.valence !== undefined || mood.danceability !== undefined)) {
        setOffset(0);
        setLoadingPreview(true);
        try {
          const token = getAccessToken();
          if (!token) return;

          // Search for tracks and filter by audio features
          // Note: Spotify API doesn't directly support audio feature filtering in search
          // So we'll search broadly and show results
          const response = await fetch(
            `https://api.spotify.com/v1/search?type=track&q=*&limit=50&offset=${offset}`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.tracks && data.tracks.items) {
              // Shuffle for variety
              const shuffled = data.tracks.items.sort(() => Math.random() - 0.5);
              setPreviewTracks(shuffled.slice(0, 8));
            }
          }
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
  }, [mood, offset]);

  const handleLoadMore = () => {
    setOffset(prev => prev + 50);
  };

  const handlePresetClick = (preset) => {
    setEnergy(preset.energy);
    setValence(preset.valence);
    setDanceability(preset.danceability);
    setUseCustom(false);
    onSelect({
      energy: preset.energy,
      valence: preset.valence,
      danceability: preset.danceability
    });
  };

  const handleSliderChange = (type, value) => {
    const numValue = parseFloat(value);
    if (type === 'energy') {
      setEnergy(numValue);
    } else if (type === 'valence') {
      setValence(numValue);
    } else if (type === 'danceability') {
      setDanceability(numValue);
    }
    setUseCustom(true);
    onSelect({
      energy: type === 'energy' ? numValue : energy,
      valence: type === 'valence' ? numValue : valence,
      danceability: type === 'danceability' ? numValue : danceability
    });
  };

  const clearSelection = () => {
    setEnergy(0.5);
    setValence(0.5);
    setDanceability(0.5);
    setUseCustom(false);
    onSelect(null);
  };

  const handleFavorite = (track) => {
    const favorites = JSON.parse(localStorage.getItem('spotify_favorites') || '[]');
    if (!favorites.find(f => f.id === track.id)) {
      favorites.push(track);
      localStorage.setItem('spotify_favorites', JSON.stringify(favorites));
    }
    setSelectedTrack(null);
  };

  const getCurrentPreset = () => {
    return MOOD_PRESETS.find(preset => 
      Math.abs(preset.energy - energy) < 0.1 &&
      Math.abs(preset.valence - valence) < 0.1 &&
      Math.abs(preset.danceability - danceability) < 0.1
    );
  };

  return (
    <WidgetContainer title="Mood" icon="😊">
      <div className="space-y-4">
        {/* Mood presets */}
        <div className="grid grid-cols-3 gap-2">
          {MOOD_PRESETS.map((preset) => {
            const isActive = !useCustom && getCurrentPreset()?.label === preset.label;
            return (
              <button
                key={preset.label}
                onClick={() => handlePresetClick(preset)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? `bg-gradient-to-br ${preset.color} border-2 border-white/30 text-white`
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Custom sliders */}
        <button
          onClick={() => {
            setUseCustom(!useCustom);
            if (!useCustom) {
              onSelect({ energy, valence, danceability });
            }
          }}
          className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            useCustom
              ? 'bg-[#1DB954]/20 text-[#1DB954] border-2 border-[#1DB954]/50'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          {useCustom ? '✓ Custom Mood' : 'Custom Mood'}
        </button>

        {useCustom && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-400">Energy: {Math.round(energy * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={energy}
                onChange={(e) => handleSliderChange('energy', e.target.value)}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#1DB954]"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-400">Valence (Positivity): {Math.round(valence * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={valence}
                onChange={(e) => handleSliderChange('valence', e.target.value)}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#1DB954]"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-400">Danceability: {Math.round(danceability * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={danceability}
                onChange={(e) => handleSliderChange('danceability', e.target.value)}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#1DB954]"
              />
            </div>
          </div>
        )}

        {/* Current selection */}
        {mood && (
          <div className="flex items-center justify-between px-3 py-2 bg-[#1DB954]/10 border border-[#1DB954]/30 rounded-lg">
            <span className="text-sm text-[#1DB954]">
              E:{Math.round(energy * 100)}% V:{Math.round(valence * 100)}% D:{Math.round(danceability * 100)}%
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
        {mood && (
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

