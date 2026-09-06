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
// Parked, 2026-09-06. Nothing mounts these: the inbox and the share page
// were the last two readers and went plain to match the desk. They stay here,
// behind this one import, because they are wanted back as plates for the
// share printer — fun things to export rather than something to sit behind a
// moderation list. Wiring them back is importing this array.
// Each receives an `albums` prop (may be ignored).
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
