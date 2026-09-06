// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/card_links.js
// The marks a card can wear: which shape stands for the rig, and which mark a
// link gets — from its address, or from the owner's override. Lifted out of
// IdentityCard.js, which draws the card and does not need to know how a
// hostname becomes a logo; About.js, which edits the card, reads these too.

import {
  CassetteTape, DeviceMobileSpeaker, DiscordLogo, Equalizer, FacebookLogo,
  GithubLogo, GlobeSimple, Guitar, Headphones, InstagramLogo, LinkSimple,
  LinkedinLogo, MastodonLogo, MediumLogo, PinterestLogo, Radio, RedditLogo,
  SnapchatLogo, SoundcloudLogo, SpeakerHifi, SpotifyLogo, TelegramLogo,
  ThreadsLogo, TiktokLogo, TwitchLogo, VinylRecord, WhatsappLogo, XLogo,
  YoutubeLogo,
} from '@phosphor-icons/react';

// ── Marks you can choose ────────────────────────────────────────────────
// The rig, as a set rather than a picture. Everybody listens on something and
// almost nobody listens on the same thing, so the software offers the shapes
// and the owner says which one is theirs — a pair of headphones printed on the
// card of somebody who plays records is worse than no mark at all.
//
// 'none' is a real answer and the first one for a reason: plenty of people
// listening on whatever came with the phone would rather not describe it, and
// this is a journal about the listening, not the equipment.
export const RIG_ICONS = [
  { name: 'none',       label: 'No rig button', Icon: null },
  { name: 'headphones', label: 'Headphones',    Icon: Headphones },
  { name: 'speakers',   label: 'Speakers',      Icon: SpeakerHifi },
  { name: 'turntable',  label: 'Turntable',     Icon: VinylRecord },
  { name: 'radio',      label: 'Radio',         Icon: Radio },
  { name: 'cassette',   label: 'Tape',          Icon: CassetteTape },
  { name: 'phone',      label: 'Phone',         Icon: DeviceMobileSpeaker },
  { name: 'guitar',     label: 'Instrument',    Icon: Guitar },
  { name: 'equalizer',  label: 'Equalizer',     Icon: Equalizer },
];
export const DEFAULT_RIG_ICON = 'headphones';

export function rigIcon(name) {
  const hit = RIG_ICONS.find(r => r.name === (name || DEFAULT_RIG_ICON));
  return hit ?? RIG_ICONS.find(r => r.name === DEFAULT_RIG_ICON);
}

// The marks a link can wear. The hostname picks one on its own — see identify()
// below, which gets it right for every service anybody names — and this is the
// override for when it does not: a personal site, a service nobody thought of,
// or simply an owner who would rather show something else.
export const LINK_ICONS = [
  { name: 'auto',      label: 'From the address', Icon: null },
  { name: 'instagram', label: 'Instagram', Icon: InstagramLogo },
  { name: 'facebook',  label: 'Facebook',  Icon: FacebookLogo },
  { name: 'x',         label: 'X',         Icon: XLogo },
  { name: 'snapchat',  label: 'Snapchat',  Icon: SnapchatLogo },
  { name: 'tiktok',    label: 'TikTok',    Icon: TiktokLogo },
  { name: 'threads',   label: 'Threads',   Icon: ThreadsLogo },
  { name: 'youtube',   label: 'YouTube',   Icon: YoutubeLogo },
  { name: 'reddit',    label: 'Reddit',    Icon: RedditLogo },
  { name: 'pinterest', label: 'Pinterest', Icon: PinterestLogo },
  { name: 'discord',   label: 'Discord',   Icon: DiscordLogo },
  { name: 'twitch',    label: 'Twitch',    Icon: TwitchLogo },
  { name: 'telegram',  label: 'Telegram',  Icon: TelegramLogo },
  { name: 'whatsapp',  label: 'WhatsApp',  Icon: WhatsappLogo },
  { name: 'mastodon',  label: 'Mastodon',  Icon: MastodonLogo },
  { name: 'soundcloud', label: 'SoundCloud', Icon: SoundcloudLogo },
  { name: 'spotify',   label: 'Spotify',   Icon: SpotifyLogo },
  { name: 'medium',    label: 'Medium',    Icon: MediumLogo },
  { name: 'github',    label: 'GitHub',    Icon: GithubLogo },
  { name: 'linkedin',  label: 'LinkedIn',  Icon: LinkedinLogo },
  { name: 'website',   label: 'Website',   Icon: GlobeSimple },
  { name: 'link',      label: 'Plain link', Icon: LinkSimple },
];

const SERVICES = [
  [/(^|\.)instagram\.com$/,   'Instagram',  InstagramLogo],
  [/(^|\.)facebook\.com$/,    'Facebook',   FacebookLogo],
  [/(^|\.)reddit\.com$/,      'Reddit',     RedditLogo],
  [/(^|\.)(x|twitter)\.com$/, 'X',          XLogo],
  [/(^|\.)threads\.(net|com)$/, 'Threads',  ThreadsLogo],
  [/(^|\.)tiktok\.com$/,      'TikTok',     TiktokLogo],
  [/(^|\.)youtube\.com$/,     'YouTube',    YoutubeLogo],
  [/(^|\.)github\.com$/,      'GitHub',     GithubLogo],
  [/(^|\.)linkedin\.com$/,    'LinkedIn',   LinkedinLogo],
  [/(^|\.)discord\.(gg|com)$/, 'Discord',   DiscordLogo],
  [/(^|\.)soundcloud\.com$/,  'SoundCloud', SoundcloudLogo],
  [/(^|\.)(open\.)?spotify\.com$/, 'Spotify', SpotifyLogo],
  [/(^|\.)twitch\.tv$/,       'Twitch',     TwitchLogo],
  [/(^|\.)medium\.com$/,      'Medium',     MediumLogo],
  [/(^|\.)snapchat\.com$/,    'Snapchat',   SnapchatLogo],
  [/(^|\.)pinterest\.(com|co\.uk)$/, 'Pinterest', PinterestLogo],
  [/(^|\.)(wa\.me|whatsapp\.com)$/, 'WhatsApp', WhatsappLogo],
  [/(^|\.)(t\.me|telegram\.me)$/, 'Telegram', TelegramLogo],
  [/(^|\.)(mastodon\.social|mas\.to)$/, 'Mastodon', MastodonLogo],
];

// Which mark to draw for a link, decided by where it points. The alternative
// was a column per service, which makes this software the authority on which
// services exist — a copy whose owner is on something nobody here thought of
// would have to wait for a migration to link to it. Anything unrecognised gets
// the plain link mark and works exactly as well.
export function identify(url, chosen) {
  let host;
  try {
    host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase();
  } catch {
    return null; // not a URL at all — better to drop it than render a dead mark
  }
  const hit = SERVICES.find(([pattern]) => pattern.test(host));
  // A mark the owner picked wins over the one the hostname suggests. The
  // hostname is right almost always and the override is for the almost.
  const picked = chosen && chosen !== 'auto'
    ? LINK_ICONS.find(i => i.name === chosen)
    : null;
  return {
    href: /^https?:\/\//i.test(url) ? url : `https://${url}`,
    label: picked ? picked.label : (hit ? hit[1] : host.replace(/^www\./, '')),
    Icon: picked?.Icon || (hit ? hit[2] : LinkSimple),
  };
}

// social_links holds plain strings from before icons could be chosen and
// { url, icon } since. Read through this so neither shape reaches the drawing.
export function readLink(entry) {
  if (typeof entry === 'string') return { url: entry, icon: 'auto' };
  return { url: entry?.url || '', icon: entry?.icon || 'auto' };
}
