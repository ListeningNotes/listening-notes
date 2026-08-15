'use client';
import { useState, useEffect, useRef } from 'react';
import { searchArtistAlbums } from '../library/music_data_api';

// Per-card delay as the album cards fly out of the network into the grid.
// The grid's echo-reel-in animation reads this too — change both together.
export const CARD_STAGGER_MS = 65;

// Manages the full album search and selection flow:
// artist search → Echo network animation → cards emerging →
// grid browsing/pagination → fly-to-centre animation → manual entry.
//
// onAlbumPick({ album, artist, year, artUrl }) is called once the user
// has chosen an album (grid click or manual submit) so the confirm
// questions can open in the parent.

export function useAlbumSelection({ step, onAlbumPick }) {
  const [artistInput, setArtistInput]     = useState('');
  const [albums, setAlbums]               = useState([]);
  const [searching, setSearching]         = useState(false);
  const [revealed, setRevealed]           = useState(false);   // Enter pressed — zoom + turbulence
  const [zoomReady, setZoomReady]         = useState(false);   // turbulence settled — albums can emerge
  const [echoFaded, setEchoFaded]         = useState(false);   // Echo fades after cards are grown
  const [albumPage, setAlbumPage]         = useState(0);
  const [nodePositions, setNodePositions] = useState(null);    // [{x,y,size}] from canvas
  const [cardPhase, setCardPhase]         = useState('hidden'); // 'hidden'|'growing'|'grid'
  const [manualAlbum, setManualAlbum]     = useState('');
  const [showManual, setShowManual]       = useState(false);
  const [pickingAlbum, setPickingAlbum]   = useState(null);   // { album, rect } — fly-to-centre
  const [pickReady, setPickReady]         = useState(false);
  const [pickFading, setPickFading]       = useState(false);  // fades album out before removing

  const zoomTimerRef = useRef(null);
  const fadeTimerRef = useRef(null);
  const cardPhaseRef = useRef(null);
  const pickTimerRef = useRef(null);
  const pickRafRef   = useRef(null);

  // Typing is an event, not something to react to after the fact — clearing the
  // field and showing the spinner happen here rather than inside the effect,
  // which used to set state synchronously on every render pass.
  function updateArtistInput(value) {
    setArtistInput(value);
    if (!value.trim()) {
      setAlbums([]);
      setSearching(false);
      setRevealed(false);
    } else {
      setSearching(true);
    }
  }

  // The effect now owns only the debounce timer.
  useEffect(() => {
    if (step !== -1) return;
    const query = artistInput.trim();
    if (!query) return;
    const id = setTimeout(async () => {
      const results = await searchArtistAlbums(query);
      setAlbums(results);
      setAlbumPage(0);   // a new result set always starts on page one
      setSearching(false);
    }, 520);
    return () => clearTimeout(id);
  }, [artistInput, step]);

  // No-results fallback: if zoomReady but nothing found, fade Echo and show "nothing found"
  useEffect(() => {
    if (!zoomReady || albums.length > 0) return;
    const t = setTimeout(() => {
      setEchoFaded(true);
      setCardPhase('grid');
    }, 900);
    return () => clearTimeout(t);
  }, [zoomReady, albums.length]);

  // Enter pressed — Echo zooms and turbulence plays while results load.
  // Albums are held back until turbulence settles. iTunes answers in well
  // under half a second, so this hold is purely for the look — keep it short.
  function handleReveal() {
    if (!artistInput.trim()) return;
    setRevealed(true);
    clearTimeout(zoomTimerRef.current);
    zoomTimerRef.current = setTimeout(() => setZoomReady(true), 900);
  }

  // Called by EchoNetwork once spotlit nodes have locked on (~1s after spotlit).
  // positions: [{x, y, size}] — real canvas coords for each spotlit node.
  // CARD_STAGGER_MS must stay in step with the echo-reel-in delay on the grid.
  function handleSpotlit(positions) {
    setNodePositions(positions);
    setCardPhase('growing');
    const allGrownMs = (positions.length - 1) * CARD_STAGGER_MS + 600;
    clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = setTimeout(() => setEchoFaded(true), allGrownMs);
    clearTimeout(cardPhaseRef.current);
    cardPhaseRef.current = setTimeout(() => {
      setCardPhase('grid');
      setNodePositions(null);
    }, allGrownMs + 300);
  }

  // Resets all search state back to the initial empty screen
  function handleClearSearch() {
    clearTimeout(zoomTimerRef.current);
    clearTimeout(fadeTimerRef.current);
    clearTimeout(cardPhaseRef.current);
    setArtistInput('');
    setAlbums([]);
    setSearching(false);
    setRevealed(false);
    setZoomReady(false);
    setEchoFaded(false);
    setNodePositions(null);
    setCardPhase('hidden');
    setAlbumPage(0);
    setShowManual(false);
    clearTimeout(pickTimerRef.current);
    cancelAnimationFrame(pickRafRef.current);
    setPickingAlbum(null);
    setPickReady(false);
    setPickFading(false);
  }

  // Grid click: fade others, fly chosen card to Q1 art position, then open confirm
  function handleGridAlbumClick(e, album) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPickReady(false);
    setPickingAlbum({ album, rect });
    cancelAnimationFrame(pickRafRef.current);
    pickRafRef.current = requestAnimationFrame(() =>
      requestAnimationFrame(() => setPickReady(true))
    );
    clearTimeout(pickTimerRef.current);
    pickTimerRef.current = setTimeout(() => {
      handleAlbumPick(album);
      setPickFading(true);
      setTimeout(() => { setPickingAlbum(null); setPickReady(false); setPickFading(false); }, 400);
    }, 1050);
  }

  // Notify parent that an album has been chosen from the grid
  function handleAlbumPick(album) {
    onAlbumPick({ album: album.name, artist: album.artist, year: album.year, artUrl: album.art, artLarge: album.artLarge, collectionId: album.collectionId, genre: album.genre });
  }

  // Notify parent that a manually typed album has been chosen
  function handleManualSubmit() {
    if (!manualAlbum.trim() || !artistInput.trim()) return;
    onAlbumPick({ album: manualAlbum.trim(), artist: artistInput.trim(), year: '', artUrl: '' });
  }

  return {
    artistInput,
    setArtistInput: updateArtistInput,
    albums,
    searching,
    revealed,
    zoomReady,
    echoFaded,
    albumPage, setAlbumPage,
    nodePositions,
    cardPhase,
    manualAlbum, setManualAlbum,
    showManual, setShowManual,
    pickingAlbum,
    pickReady,
    pickFading,
    handleReveal,
    handleClearSearch,
    handleSpotlit,
    handleGridAlbumClick,
    handleAlbumPick,
    handleManualSubmit,
  };
}
