'use client';

import { useState, useEffect, useRef } from 'react';
import TrackPopup from './TrackPopup';

export default function FavoritesSoup() {
  const [favorites, setFavorites] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const particlesRef = useRef([]);
  const linksRef = useRef([]);
  const imagesRef = useRef(new Map());
  const cameraAngleRef = useRef(0);
  const timeRef = useRef(0);
  const previousFavoritesRef = useRef([]);

  // Load favorites from localStorage
  useEffect(() => {
    const loadFavorites = () => {
      const stored = localStorage.getItem('spotify_favorites');
      if (stored) {
        try {
          const favs = JSON.parse(stored);
          setFavorites(favs);
          updateGraphIncrementally(favs);
        } catch (error) {
          console.error('Error loading favorites:', error);
        }
      }
    };

    loadFavorites();
    // Listen for storage changes (in case favorites are added from other tabs)
    window.addEventListener('storage', loadFavorites);
    // Also check periodically for changes in same tab
    const interval = setInterval(loadFavorites, 500);

    return () => {
      window.removeEventListener('storage', loadFavorites);
      clearInterval(interval);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Calculate connections between two tracks (with more criteria and relaxed thresholds)
  const calculateConnection = (track1, track2) => {
    let connectionStrength = 0;
    let connectionType = '';
    const types = [];

    // Same artist (strongest)
    const artists1 = track1.artists?.map(a => a.id) || [];
    const artists2 = track2.artists?.map(a => a.id) || [];
    const commonArtists = artists1.filter(id => artists2.includes(id));
    if (commonArtists.length > 0) {
      connectionStrength += 0.8;
      connectionType = 'artist';
      types.push('artist');
    }

    // Same album
    if (track1.album?.id === track2.album?.id) {
      connectionStrength += 0.6;
      if (!connectionType) connectionType = 'album';
      types.push('album');
    }

    // Similar popularity (relaxed: within 30 points, with gradient strength)
    if (track1.popularity && track2.popularity) {
      const popDiff = Math.abs(track1.popularity - track2.popularity);
      if (popDiff < 30) {
        // Gradient: closer = stronger connection
        const strength = 0.5 * (1 - popDiff / 30);
        connectionStrength += strength;
        if (!connectionType) connectionType = 'popularity';
        types.push('popularity');
      }
    }

    // Same release year (relaxed: within 5 years)
    if (track1.album?.release_date && track2.album?.release_date) {
      const year1 = new Date(track1.album.release_date).getFullYear();
      const year2 = new Date(track2.album.release_date).getFullYear();
      const yearDiff = Math.abs(year1 - year2);
      if (yearDiff <= 5) {
        const strength = 0.4 * (1 - yearDiff / 5);
        connectionStrength += strength;
        if (!connectionType) connectionType = 'year';
        types.push('year');
      }
    }

    // Similar duration (relaxed: within 60 seconds, with gradient)
    if (track1.duration_ms && track2.duration_ms) {
      const durationDiff = Math.abs(track1.duration_ms - track2.duration_ms);
      if (durationDiff < 60000) { // 60 seconds
        const strength = 0.3 * (1 - durationDiff / 60000);
        connectionStrength += strength;
        if (!connectionType) connectionType = 'duration';
        types.push('duration');
      }
    }

    // Same genre (if available in album or track)
    const genres1 = track1.album?.genres || [];
    const genres2 = track2.album?.genres || [];
    const commonGenres = genres1.filter(g => genres2.includes(g));
    if (commonGenres.length > 0) {
      connectionStrength += 0.35;
      if (!connectionType) connectionType = 'genre';
      types.push('genre');
    }

    // Similar track number position (same album context, relaxed)
    if (track1.album?.id === track2.album?.id && track1.track_number && track2.track_number) {
      const trackDiff = Math.abs(track1.track_number - track2.track_number);
      if (trackDiff <= 5) { // Relaxed from 3 to 5
        const strength = 0.25 * (1 - trackDiff / 5);
        connectionStrength += strength;
        if (!connectionType) connectionType = 'position';
        types.push('position');
      }
    }

    // Both explicit or both not explicit
    if (track1.explicit !== undefined && track2.explicit !== undefined) {
      if (track1.explicit === track2.explicit) {
        connectionStrength += 0.15;
        if (!connectionType) connectionType = 'explicit';
        types.push('explicit');
      }
    }

    // NEW: Similar album name (fuzzy match - same words)
    if (track1.album?.name && track2.album?.name) {
      const words1 = track1.album.name.toLowerCase().split(/\s+/);
      const words2 = track2.album.name.toLowerCase().split(/\s+/);
      const commonWords = words1.filter(w => words2.includes(w) && w.length > 2);
      if (commonWords.length > 0) {
        connectionStrength += 0.2;
        if (!connectionType) connectionType = 'album-name';
        types.push('album-name');
      }
    }

    // NEW: Similar track name length
    if (track1.name && track2.name) {
      const len1 = track1.name.length;
      const len2 = track2.name.length;
      const lenDiff = Math.abs(len1 - len2);
      const avgLen = (len1 + len2) / 2;
      if (lenDiff / avgLen < 0.3) { // Within 30% length difference
        connectionStrength += 0.1;
        if (!connectionType) connectionType = 'name-length';
        types.push('name-length');
      }
    }

    // NEW: Same record label (if available)
    if (track1.album?.label && track2.album?.label) {
      if (track1.album.label === track2.album.label) {
        connectionStrength += 0.25;
        if (!connectionType) connectionType = 'label';
        types.push('label');
      }
    }

    // NEW: Similar popularity tier (mainstream, popular, underground)
    if (track1.popularity && track2.popularity) {
      const getTier = (pop) => {
        if (pop >= 70) return 'mainstream';
        if (pop >= 40) return 'popular';
        return 'underground';
      };
      if (getTier(track1.popularity) === getTier(track2.popularity)) {
        connectionStrength += 0.2;
        if (!connectionType) connectionType = 'tier';
        types.push('tier');
      }
    }

    // NEW: Same decade (broader than year)
    if (track1.album?.release_date && track2.album?.release_date) {
      const year1 = new Date(track1.album.release_date).getFullYear();
      const year2 = new Date(track2.album.release_date).getFullYear();
      const decade1 = Math.floor(year1 / 10) * 10;
      const decade2 = Math.floor(year2 / 10) * 10;
      if (decade1 === decade2) {
        connectionStrength += 0.25;
        if (!connectionType) connectionType = 'decade';
        types.push('decade');
      }
    }

    // NEW: Similar number of artists
    if (track1.artists && track2.artists) {
      const artistCount1 = track1.artists.length;
      const artistCount2 = track2.artists.length;
      if (Math.abs(artistCount1 - artistCount2) <= 1) {
        connectionStrength += 0.1;
        if (!connectionType) connectionType = 'artist-count';
        types.push('artist-count');
      }
    }

    return {
      strength: connectionStrength,
      type: connectionType,
      types: types.length > 0 ? types : [connectionType]
    };
  };

  // Incrementally update graph without recreating
  const updateGraphIncrementally = (tracks) => {
    const previousIds = new Set(previousFavoritesRef.current.map(t => t.id));
    const currentIds = new Set(tracks.map(t => t.id));
    
    // Find new tracks
    const newTracks = tracks.filter(t => !previousIds.has(t.id));
    
    // Find removed tracks
    const removedIds = Array.from(previousIds).filter(id => !currentIds.has(id));
    
    // Remove deleted particles
    if (removedIds.length > 0) {
      particlesRef.current = particlesRef.current.filter(p => !removedIds.includes(p.id));
      linksRef.current = linksRef.current.filter(link => 
        !removedIds.includes(link.source) && !removedIds.includes(link.target)
      );
    }

    // Add new particles
    if (newTracks.length > 0) {
      const canvas = canvasRef.current;
      const width = canvas?.offsetWidth || 800;
      const height = canvas?.offsetHeight || 500;
      
      // Rotate camera angle when adding new nodes
      cameraAngleRef.current += Math.PI / 6; // 30 degrees
      
      newTracks.forEach((track, index) => {
        // Position new nodes in a spiral pattern
        const angle = cameraAngleRef.current + (index * Math.PI / 4);
        const radius = 150 + (index * 30);
        const centerX = width / 2;
        const centerY = height / 2;
        
        const particle = {
          id: track.id,
          track,
          baseX: centerX + Math.cos(angle) * radius,
          baseY: centerY + Math.sin(angle) * radius,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
          radius: 30,
          floatOffsetX: Math.random() * 20 - 10,
          floatOffsetY: Math.random() * 20 - 10,
          floatSpeed: 0.5 + Math.random() * 0.5,
          floatPhase: Math.random() * Math.PI * 2,
        };
        
        particlesRef.current.push(particle);
        
        // Preload image
        if (track.album?.images?.[2]?.url && !imagesRef.current.has(track.id)) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            imagesRef.current.set(track.id, img);
          };
          img.onerror = () => {
            imagesRef.current.set(track.id, null);
          };
          img.src = track.album.images[2].url;
        }
      });

          // Calculate new links for new tracks
          newTracks.forEach(newTrack => {
            particlesRef.current.forEach(particle => {
              if (particle.id === newTrack.id) return;
              const connection = calculateConnection(newTrack, particle.track);
              if (connection.strength > 0.08) { // Lowered threshold from 0.15 to 0.08
                linksRef.current.push({
                  source: newTrack.id,
                  target: particle.id,
                  strength: connection.strength,
                  type: connection.type,
                  types: connection.types,
                });
              }
            });
          });
        }

        // Recalculate all links to ensure we have all connections
        const allLinks = [];
        for (let i = 0; i < particlesRef.current.length; i++) {
          for (let j = i + 1; j < particlesRef.current.length; j++) {
            const particle1 = particlesRef.current[i];
            const particle2 = particlesRef.current[j];
            const connection = calculateConnection(particle1.track, particle2.track);
            if (connection.strength > 0.08) { // Lowered threshold from 0.15 to 0.08
              allLinks.push({
                source: particle1.id,
                target: particle2.id,
                strength: connection.strength,
                type: connection.type,
                types: connection.types,
              });
            }
          }
        }
        linksRef.current = allLinks;
    
    previousFavoritesRef.current = tracks;
  };

  // Preload images for all particles
  useEffect(() => {
    particlesRef.current.forEach(particle => {
      const track = particle.track;
      if (track.album?.images?.[2]?.url && !imagesRef.current.has(track.id)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          imagesRef.current.set(track.id, img);
        };
        img.onerror = () => {
          imagesRef.current.set(track.id, null);
        };
        img.src = track.album.images[2].url;
      }
    });
  }, [favorites]);

  // Physics simulation and rendering with sea-like floating
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    const particles = particlesRef.current;
    if (particles.length === 0) return;

    // Initialize base positions if needed
    particles.forEach((particle) => {
      if (particle.baseX === undefined || particle.baseY === undefined) {
        particle.baseX = particle.x || Math.random() * (width - 100) + 50;
        particle.baseY = particle.y || Math.random() * (height - 100) + 50;
        particle.x = particle.baseX;
        particle.y = particle.baseY;
      }
      if (particle.floatOffsetX === undefined) {
        particle.floatOffsetX = Math.random() * 8 - 4; // Reduced from 20-10 to 8-4
        particle.floatOffsetY = Math.random() * 8 - 4; // Reduced from 20-10 to 8-4
        particle.floatSpeed = 0.3 + Math.random() * 0.2; // Reduced from 0.5-1.0 to 0.3-0.5
        particle.floatPhase = Math.random() * Math.PI * 2;
      }
    });

    // Force simulation parameters (very gentle)
    const repulsionStrength = 2000;
    const linkDistance = 100;
    const linkStrength = 0.08;
    const damping = 0.98;
    const seaStrength = 0.1; // Reduced from 0.3 to 0.1 - much less movement

    const animate = () => {
      timeRef.current += 0.016; // ~60fps

      // Handle resize
      if (canvas.offsetWidth !== width || canvas.offsetHeight !== height) {
        width = canvas.offsetWidth;
        height = canvas.offsetHeight;
        canvas.width = width;
        canvas.height = height;
      }

      // Clear canvas - use fully opaque background to prevent flashing
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, width, height);

      // Update particle positions (gentle physics + sea floating)
      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        let fx = 0, fy = 0;

        // Gentle repulsion from other particles
        for (let j = 0; j < particles.length; j++) {
          if (i === j) continue;
          const other = particles[j];
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          if (distance < 100) {
            const force = repulsionStrength / (distance * distance + 1);
            fx += (dx / distance) * force;
            fy += (dy / distance) * force;
          }
        }

        // Gentle attraction from links
        linksRef.current.forEach(link => {
          const source = particles.find(p => p.id === link.source);
          const target = particles.find(p => p.id === link.target);
          if (!source || !target) return;

          if (particle.id === source.id || particle.id === target.id) {
            const other = particle.id === source.id ? target : source;
            const dx = other.x - particle.x;
            const dy = other.y - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const diff = distance - linkDistance;
            const force = diff * linkStrength * link.strength;
            fx += (dx / distance) * force;
            fy += (dy / distance) * force;
          }
        });

        // Return to base position (maintains structure) - stronger return
        const returnToBaseX = (particle.baseX - particle.x) * 0.05; // Increased from 0.02
        const returnToBaseY = (particle.baseY - particle.y) * 0.05; // Increased from 0.02
        fx += returnToBaseX;
        fy += returnToBaseY;

        // Sea-like floating motion (sinusoidal)
        const floatX = Math.sin(timeRef.current * particle.floatSpeed + particle.floatPhase) * particle.floatOffsetX * seaStrength;
        const floatY = Math.cos(timeRef.current * particle.floatSpeed * 0.7 + particle.floatPhase) * particle.floatOffsetY * seaStrength;
        
        // Boundary constraints with soft walls
        const margin = 60;
        if (particle.x < margin) fx += (margin - particle.x) * 0.1;
        if (particle.x > width - margin) fx -= (particle.x - (width - margin)) * 0.1;
        if (particle.y < margin) fy += (margin - particle.y) * 0.1;
        if (particle.y > height - margin) fy -= (particle.y - (height - margin)) * 0.1;

        // Update velocity and position
        particle.vx = (particle.vx + fx * 0.005) * damping;
        particle.vy = (particle.vy + fy * 0.005) * damping;
        particle.x += particle.vx + floatX;
        particle.y += particle.vy + floatY;
      }

      // Apply camera rotation transform
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(cameraAngleRef.current * 0.1); // Subtle rotation effect
      ctx.translate(-width / 2, -height / 2);

      // Draw links
      linksRef.current.forEach(link => {
        const source = particles.find(p => p.id === link.source);
        const target = particles.find(p => p.id === link.target);
        if (!source || !target) return;

        ctx.save();
        ctx.globalAlpha = link.strength * 0.35;
        ctx.strokeStyle = getLinkColor(link.type);
        ctx.lineWidth = link.strength * 1.2;
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
        ctx.restore();
      });

      // Draw nodes
      particles.forEach(particle => {
        const track = particle.track;
        
        // Draw connection glow
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = '#1DB954';
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius + 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Draw album cover or placeholder
        const img = imagesRef.current.get(track.id);
        if (img) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, particle.x - particle.radius, particle.y - particle.radius, particle.radius * 2, particle.radius * 2);
          ctx.restore();
        } else {
          // Placeholder circle
          ctx.fillStyle = '#1DB954';
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.font = 'bold 18px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🎵', particle.x, particle.y);
        }

        // Draw border
        ctx.strokeStyle = '#1DB954';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.stroke();
      });

      ctx.restore(); // Restore camera transform

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle click events
    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if click is on any particle
      for (const particle of particles) {
        const dx = x - particle.x;
        const dy = y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= particle.radius) {
          setSelectedTrack(particle.track);
          break;
        }
      }
    };

    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('click', handleClick);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [favorites]);

  const getLinkColor = (type) => {
    switch (type) {
      case 'artist': return '#1DB954';
      case 'album': return '#1ed760';
      case 'popularity': return '#FFD700';
      case 'year': return '#9B59B6';
      case 'duration': return '#3498DB';
      case 'genre': return '#E74C3C';
      case 'position': return '#F39C12';
      case 'explicit': return '#E91E63';
      case 'album-name': return '#16A085';
      case 'name-length': return '#95A5A6';
      case 'label': return '#E67E22';
      case 'tier': return '#F1C40F';
      case 'decade': return '#8E44AD';
      case 'artist-count': return '#34495E';
      default: return '#FFFFFF';
    }
  };

  if (favorites.length === 0) {
    return (
      <div className="relative backdrop-blur-sm bg-white/5 rounded-xl p-8 border border-white/10">
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#1DB954]/20 to-[#1ed760]/20 mb-4">
            <span className="text-4xl">⭐</span>
          </div>
          <p className="text-gray-300 text-lg font-medium mb-2">No favorites yet</p>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Start adding tracks to your favorites from the widget previews to see them here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative backdrop-blur-sm bg-white/5 rounded-xl p-6 border border-white/10 overflow-hidden">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[#1DB954]/20 flex items-center justify-center text-xl">
          ⭐
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Favorites Network</h3>
          <p className="text-xs text-gray-400">{favorites.length} tracks connected</p>
        </div>
      </div>
      
      <div className="relative rounded-lg overflow-hidden bg-black/20" style={{ height: '500px' }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: 'block' }}
        />
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg p-3 text-xs space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
          <p className="text-white font-medium mb-2">Connections:</p>
          <div className="grid grid-cols-2 gap-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#1DB954]"></div>
              <span className="text-gray-300">Artist</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#1ed760]"></div>
              <span className="text-gray-300">Album</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FFD700]"></div>
              <span className="text-gray-300">Popularity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#9B59B6]"></div>
              <span className="text-gray-300">Year</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#3498DB]"></div>
              <span className="text-gray-300">Duration</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#E74C3C]"></div>
              <span className="text-gray-300">Genre</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#F39C12]"></div>
              <span className="text-gray-300">Position</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#E91E63]"></div>
              <span className="text-gray-300">Explicit</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#16A085]"></div>
              <span className="text-gray-300">Album Name</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#8E44AD]"></div>
              <span className="text-gray-300">Decade</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#F1C40F]"></div>
              <span className="text-gray-300">Tier</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#E67E22]"></div>
              <span className="text-gray-300">Label</span>
            </div>
          </div>
        </div>
      </div>

      {/* Track Popup */}
      <TrackPopup
        track={selectedTrack}
        isOpen={!!selectedTrack}
        onClose={() => setSelectedTrack(null)}
        onFavorite={(track) => {
          // Refresh favorites list after favorite/unfavorite
          const stored = localStorage.getItem('spotify_favorites');
          if (stored) {
            try {
              const favs = JSON.parse(stored);
              setFavorites(favs);
              updateGraphIncrementally(favs);
            } catch (error) {
              console.error('Error loading favorites:', error);
            }
          }
        }}
      />
    </div>
  );
}

