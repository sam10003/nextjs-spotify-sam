'use client';

import { useState, useMemo, useEffect } from 'react';
import WidgetContainer from './WidgetContainer';
import { fetchGenrePreviewTracks } from '@/lib/spotify';
import TrackPopup from '../TrackPopup';

const GENRES = [
  'acoustic', 'afrobeat', 'alt-rock', 'alternative', 'ambient',
  'anime', 'black-metal', 'bluegrass', 'blues', 'bossanova',
  'brazil', 'breakbeat', 'british', 'cantopop', 'chicago-house',
  'children', 'chill', 'classical', 'club', 'comedy',
  'country', 'dance', 'dancehall', 'death-metal', 'deep-house',
  'detroit-techno', 'disco', 'disney', 'drum-and-bass', 'dub',
  'dubstep', 'edm', 'electro', 'electronic', 'emo',
  'folk', 'forro', 'french', 'funk', 'garage',
  'german', 'gospel', 'goth', 'grindcore', 'groove',
  'grunge', 'guitar', 'happy', 'hard-rock', 'hardcore',
  'hardstyle', 'heavy-metal', 'hip-hop', 'house', 'idm',
  'indian', 'indie', 'indie-pop', 'industrial', 'iranian',
  'j-dance', 'j-idol', 'j-pop', 'j-rock', 'jazz',
  'k-pop', 'kids', 'latin', 'latino', 'malay',
  'mandopop', 'metal', 'metal-misc', 'metalcore', 'minimal-techno',
  'movies', 'mpb', 'new-age', 'new-release', 'opera',
  'pagode', 'party', 'philippines-opm', 'piano', 'pop',
  'pop-film', 'post-dubstep', 'power-pop', 'progressive-house', 'psych-rock',
  'punk', 'punk-rock', 'r-n-b', 'rainy-day', 'reggae',
  'reggaeton', 'road-trip', 'rock', 'rock-n-roll', 'rockabilly',
  'romance', 'sad', 'salsa', 'samba', 'sertanejo',
  'show-tunes', 'singer-songwriter', 'ska', 'sleep', 'songwriter',
  'soul', 'soundtracks', 'spanish', 'study', 'summer',
  'swedish', 'synth-pop', 'tango', 'techno', 'trance',
  'trip-hop', 'turkish', 'work-out', 'world-music'
];

const MAX_SELECTIONS = 5;

export default function GenreWidget({ selectedGenres = [], onSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTracks, setPreviewTracks] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState(null);

  const filteredGenres = useMemo(() => {
    if (!searchQuery.trim()) {
      return GENRES;
    }
    const query = searchQuery.toLowerCase();
    return GENRES.filter(genre => genre.toLowerCase().includes(query));
  }, [searchQuery]);

  const handleToggleGenre = (genre) => {
    if (selectedGenres.includes(genre)) {
      // Remove genre
      onSelect(selectedGenres.filter(g => g !== genre));
    } else {
      // Add genre (with limit)
      if (selectedGenres.length < MAX_SELECTIONS) {
        onSelect([...selectedGenres, genre]);
      }
    }
  };

  const handleRemoveGenre = (genre) => {
    onSelect(selectedGenres.filter(g => g !== genre));
  };

  // Fetch preview tracks when genres are selected (reset offset)
  useEffect(() => {
    const loadPreviewTracks = async () => {
      if (selectedGenres.length > 0) {
        setOffset(0); // Reset offset when selections change
        setLoadingPreview(true);
        try {
          const tracks = await fetchGenrePreviewTracks(selectedGenres, 8, 0);
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
  }, [selectedGenres]);

  const handleLoadMore = async () => {
    if (selectedGenres.length === 0) return;
    setLoadingPreview(true);
    try {
      // Increment offset to get next batch
      const newOffset = offset + 8;
      setOffset(newOffset);
      const tracks = await fetchGenrePreviewTracks(selectedGenres, 8, newOffset);
      setPreviewTracks(tracks); // Replace with new batch
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

  return (
    <WidgetContainer title="Genres" icon="🎸">
      <div className="space-y-4">
        {/* Search input */}
        <input
          type="text"
          placeholder="Search genres..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#1DB954]/50 transition-colors text-sm"
        />

        {/* Selected genres */}
        {selectedGenres.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedGenres.map((genre) => (
              <span
                key={genre}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1DB954]/20 text-[#1DB954] rounded-full text-xs font-medium border border-[#1DB954]/30"
              >
                {genre}
                <button
                  onClick={() => handleRemoveGenre(genre)}
                  className="hover:text-red-400 transition-colors"
                  aria-label={`Remove ${genre}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Genre list */}
        <div className="max-h-64 overflow-y-auto space-y-1 custom-scrollbar">
          {filteredGenres.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No genres found</p>
          ) : (
            filteredGenres.map((genre) => {
              const isSelected = selectedGenres.includes(genre);
              const isDisabled = !isSelected && selectedGenres.length >= MAX_SELECTIONS;
              
              return (
                <button
                  key={genre}
                  onClick={() => handleToggleGenre(genre)}
                  disabled={isDisabled}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    isSelected
                      ? 'bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/30'
                      : isDisabled
                      ? 'text-gray-600 cursor-not-allowed'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="capitalize">{genre.replace(/-/g, ' ')}</span>
                  {isSelected && <span className="ml-2 text-[#1DB954]">✓</span>}
                </button>
              );
            })
          )}
        </div>

        {/* Selection limit indicator */}
        <p className="text-xs text-gray-500 text-center">
          {selectedGenres.length} / {MAX_SELECTIONS} selected
        </p>

        {/* Preview Tracks */}
        {selectedGenres.length > 0 && (
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

