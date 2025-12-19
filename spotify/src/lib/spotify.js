import { getAccessToken } from '@/lib/auth';

// Fetch preview tracks for genres
export async function fetchGenrePreviewTracks(genres, limit = 8, offset = 0) {
  if (!genres || genres.length === 0) return [];
  
  const token = getAccessToken();
  if (!token) return [];
  
  const allTracks = [];
  
  // Fetch tracks for each selected genre with offset
  for (const genre of genres.slice(0, 2)) { // Limit to first 2 genres for preview
    try {
      const perGenreLimit = Math.ceil(limit / genres.length);
      const genreOffset = Math.floor(offset / genres.length);
      
      const response = await fetch(
        `https://api.spotify.com/v1/search?type=track&q=genre:${genre}&limit=${perGenreLimit}&offset=${genreOffset}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.tracks && data.tracks.items) {
          allTracks.push(...data.tracks.items);
        }
      }
    } catch (error) {
      console.error(`Error fetching tracks for genre ${genre}:`, error);
    }
  }
  
  // Remove duplicates
  const uniqueTracks = Array.from(
    new Map(allTracks.map(track => [track.id, track])).values()
  );
  
  // Shuffle for variety and limit
  const shuffled = uniqueTracks.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit);
}

// Fetch preview tracks for decades
export async function fetchDecadePreviewTracks(decades, limit = 8, offset = 0) {
  if (!decades || decades.length === 0) return [];
  
  const token = getAccessToken();
  if (!token) return [];
  
  const allTracks = [];
  
  // Fetch tracks for each selected decade with offset
  for (const decadeStart of decades) {
    try {
      const perDecadeLimit = Math.ceil(limit / decades.length);
      const decadeOffset = Math.floor(offset / decades.length);
      
      // Search for tracks in this decade range
      const year = decadeStart;
      const response = await fetch(
        `https://api.spotify.com/v1/search?type=track&q=year:${year}-${year + 9}&limit=${perDecadeLimit}&offset=${decadeOffset}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.tracks && data.tracks.items) {
          allTracks.push(...data.tracks.items);
        }
      }
    } catch (error) {
      console.error(`Error fetching tracks for decade ${decadeStart}:`, error);
    }
  }
  
  // Remove duplicates
  const uniqueTracks = Array.from(
    new Map(allTracks.map(track => [track.id, track])).values()
  );
  
  // Shuffle for variety and limit
  const shuffled = uniqueTracks.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit);
}

// Fetch preview tracks for popularity range
export async function fetchPopularityPreviewTracks(popularity, limit = 8, offset = 0) {
  if (!popularity || popularity.length !== 2) return [];
  
  const token = getAccessToken();
  if (!token) return [];
  
  try {
    // Get tracks with offset and filter by popularity range
    // Fetch more to account for filtering
    const fetchLimit = Math.max(limit * 3, 50);
    const response = await fetch(
      `https://api.spotify.com/v1/search?type=track&q=*&limit=${fetchLimit}&offset=${offset}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.tracks && data.tracks.items) {
        const [min, max] = popularity;
        const filtered = data.tracks.items.filter(
          track => track.popularity >= min && track.popularity <= max
        );
        
        // Shuffle for variety and limit
        const shuffled = filtered.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, limit);
      }
    }
  } catch (error) {
    console.error('Error fetching popularity tracks:', error);
  }
  
  return [];
}

export async function generatePlaylist(preferences) {
  const { artists, genres, decades, popularity } = preferences;
  const token = getAccessToken();
  let allTracks = [];

  // 1. Obtener top tracks de artistas seleccionados
  for (const artist of artists) {
    const tracks = await fetch(
      `https://api.spotify.com/v1/artists/${artist.id}/top-tracks?market=US`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    const data = await tracks.json();
    allTracks.push(...data.tracks);
  }

  // 2. Buscar por géneros
  for (const genre of genres) {
    const results = await fetch(
      `https://api.spotify.com/v1/search?type=track&q=genre:${genre}&limit=20`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    const data = await results.json();
    allTracks.push(...data.tracks.items);
  }

  // 3. Filtrar por década
  if (decades.length > 0) {
    allTracks = allTracks.filter(track => {
      const year = new Date(track.album.release_date).getFullYear();
      return decades.some(decade => {
        const decadeStart = parseInt(decade);
        return year >= decadeStart && year < decadeStart + 10;
      });
    });
  }

  // 4. Filtrar por popularidad
  if (popularity) {
    const [min, max] = popularity;
    allTracks = allTracks.filter(
      track => track.popularity >= min && track.popularity <= max
    );
  }

  // 5. Eliminar duplicados y limitar a 30 canciones
  const uniqueTracks = Array.from(
    new Map(allTracks.map(track => [track.id, track])).values()
  ).slice(0, 30);

  return uniqueTracks;
}

// Generate playlist from favorites
export async function generatePlaylistFromFavorites(favorites) {
  if (!favorites || favorites.length < 5) {
    throw new Error('You need at least 5 favorite tracks to generate a playlist');
  }

  const token = getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const TARGET_TRACK_COUNT = 30; // Fixed number of tracks
  let allTracks = [];
  const favoriteTrackIds = new Set(favorites.map(f => f.id));
  const artistIds = new Set();

  // Extract artists from favorites
  favorites.forEach(track => {
    track.artists?.forEach(artist => artistIds.add(artist.id));
  });

  const artistArray = Array.from(artistIds);

  // 1. Get top tracks from ALL favorite artists (excluding favorites themselves)
  for (const artistId of artistArray) {
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (response.ok) {
        const data = await response.json();
        const tracks = data.tracks.filter(t => !favoriteTrackIds.has(t.id));
        allTracks.push(...tracks);
      }
    } catch (error) {
      console.error(`Error fetching tracks for artist ${artistId}:`, error);
    }
  }

  // 2. Get related artists and their top tracks (expand until we have enough)
  let relatedArtistsProcessed = 0;
  const maxRelatedArtists = Math.min(artistArray.length * 3, 20); // Process more related artists
  
  for (const artistId of artistArray) {
    if (allTracks.length >= TARGET_TRACK_COUNT * 2) break; // Stop if we have enough
    
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/artists/${artistId}/related-artists`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (response.ok) {
        const data = await response.json();
        // Get more related artists (up to 3 per favorite artist)
        for (const relatedArtist of data.artists.slice(0, 3)) {
          if (relatedArtistsProcessed >= maxRelatedArtists) break;
          
          const tracksResponse = await fetch(
            `https://api.spotify.com/v1/artists/${relatedArtist.id}/top-tracks?market=US`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );
          if (tracksResponse.ok) {
            const tracksData = await tracksResponse.json();
            const tracks = tracksData.tracks.filter(t => !favoriteTrackIds.has(t.id));
            allTracks.push(...tracks);
            relatedArtistsProcessed++;
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching related artists for ${artistId}:`, error);
    }
  }

  // 3. Search for tracks by artist name (if we still need more)
  if (allTracks.length < TARGET_TRACK_COUNT * 1.5) {
    for (const favorite of favorites) {
      if (allTracks.length >= TARGET_TRACK_COUNT * 2) break;
      
      if (favorite.artists && favorite.artists.length > 0) {
        const artistName = favorite.artists[0].name;
        try {
          const response = await fetch(
            `https://api.spotify.com/v1/search?type=track&q=artist:${encodeURIComponent(artistName)}&limit=20`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );
          if (response.ok) {
            const data = await response.json();
            const tracks = data.tracks.items.filter(t => !favoriteTrackIds.has(t.id));
            allTracks.push(...tracks);
          }
        } catch (error) {
          console.error(`Error searching tracks for ${artistName}:`, error);
        }
      }
    }
  }

  // 4. If still not enough, search by album names from favorites
  if (allTracks.length < TARGET_TRACK_COUNT * 1.5) {
    for (const favorite of favorites.slice(0, 10)) {
      if (allTracks.length >= TARGET_TRACK_COUNT * 2) break;
      
      if (favorite.album?.name) {
        try {
          const response = await fetch(
            `https://api.spotify.com/v1/search?type=track&q=album:${encodeURIComponent(favorite.album.name)}&limit=10`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );
          if (response.ok) {
            const data = await response.json();
            const tracks = data.tracks.items.filter(t => !favoriteTrackIds.has(t.id));
            allTracks.push(...tracks);
          }
        } catch (error) {
          console.error(`Error searching by album ${favorite.album.name}:`, error);
        }
      }
    }
  }

  // 5. Remove duplicates
  const uniqueTracks = Array.from(
    new Map(allTracks.map(track => [track.id, track])).values()
  );

  // 6. If we still don't have enough, fill with random popular tracks from favorite artists
  if (uniqueTracks.length < TARGET_TRACK_COUNT) {
    // Get more tracks from favorite artists with offset
    for (const artistId of artistArray) {
      if (uniqueTracks.length >= TARGET_TRACK_COUNT) break;
      
      try {
        // Search for more tracks by this artist
        const artist = favorites.find(f => f.artists?.some(a => a.id === artistId))?.artists?.find(a => a.id === artistId);
        if (artist) {
          const response = await fetch(
            `https://api.spotify.com/v1/search?type=track&q=artist:${encodeURIComponent(artist.name)}&limit=20&offset=${uniqueTracks.length}`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );
          if (response.ok) {
            const data = await response.json();
            const tracks = data.tracks.items.filter(t => !favoriteTrackIds.has(t.id));
            uniqueTracks.push(...tracks);
          }
        }
      } catch (error) {
        console.error(`Error fetching additional tracks for artist:`, error);
      }
    }
  }

  // 7. Remove duplicates again after adding more tracks
  const finalTracks = Array.from(
    new Map(uniqueTracks.map(track => [track.id, track])).values()
  );

  // 8. Shuffle and return exactly TARGET_TRACK_COUNT tracks
  const shuffled = finalTracks.sort(() => Math.random() - 0.5);
  
  // If we have fewer than target, return what we have (shouldn't happen with improved logic)
  if (shuffled.length < TARGET_TRACK_COUNT) {
    console.warn(`Only found ${shuffled.length} tracks, expected ${TARGET_TRACK_COUNT}`);
    return shuffled;
  }
  
  return shuffled.slice(0, TARGET_TRACK_COUNT);
}