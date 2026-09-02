// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import Rain        from './Rain';
import DVD         from './DVD';
import Gallery       from './Gallery';
import Fizzy       from './Fizzy';
import SplitScreen from './SplitScreen';
import Snake       from './Snake';
import Pong        from './Pong';
import Solitaire   from './Solitaire';
import Reel        from './Reel';
// The network of floating covers that used to open every listen. Ambient here
// rather than in the way — see components/session_components/AlbumPicker.js.
import EchoNetwork from './EchoNetwork';
// Add new backgrounds here — each receives an `albums` prop (may be ignored)
const backgrounds = [
  Rain,
  DVD,
  Gallery,
  Fizzy,
  SplitScreen,
  Snake,
  Pong,
  Solitaire,
  Reel,
  EchoNetwork,
];

export default backgrounds;
