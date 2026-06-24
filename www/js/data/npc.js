import { ASSETS } from './config.js';

// Tavern NPCs: the short hero-card greeting shown every visit, and the longer
// full-screen intro shown only on the first open of each hall. Portraits are
// "folder/file" under ASSETS.characters.
export const NPC = {
  inn: {
    key: 'inn',
    speaker: 'The Innkeeper',
    bg: ASSETS.bgInn,
    heroPortrait: 'innkeeper/innkeeper_cheerful',
    heroLine: 'Pull up a stool, knight — a good drink restores the spirit, and your stamina.',
    introPortrait: 'innkeeper/innkeeper_happy',
    introLine: 'Welcome to my inn, knight! Weary bones and empty tankards both find their comfort here. A good drink restores your stamina — rest a while, then return to your quest the stronger for it.',
  },
  bard: {
    key: 'bard',
    speaker: 'The Bard',
    bg: ASSETS.bgBards,
    heroPortrait: 'bard/bard_playful',
    heroLine: "Sit, friend. Every stage has its song — and I've a tale or two worth a coin.",
    introPortrait: 'bard/bard_bowing',
    introLine: "Ahh — a knight with an ear for music! Every stage of your journey carries its own song, and I'll teach you each as you travel on. Linger a while; my tales are worth a coin or two.",
  },
  gambler: {
    key: 'gambler',
    speaker: 'The Gambler',
    bg: ASSETS.bgGamblers,
    heroPortrait: 'gambler/gambler_sly',
    heroLine: 'One coin a throw. Beat the odds and the stamina’s yours, knight.',
    introPortrait: 'gambler/gambler_grinning',
    introLine: 'Heh — feeling lucky, knight? One coin buys a throw of the dice. Beat the odds and the winnings are stamina; lose, and the house takes its bite. Care to try your fortune?',
  },
  blacksmith: {
    key: 'blacksmith',
    speaker: 'The Blacksmith',
    bg: ASSETS.bgBlacksmith,
    heroPortrait: 'blacksmith/blacksmith_happy',
    heroLine: 'Coin for steel, knight — every edge helps on the road ahead.',
    introPortrait: 'blacksmith/blacksmith_neutral',
    introLine: 'Welcome to my forge, knight. Power-ups are my trade — a Raven to scout, a Torch to light the board, a Shield to hold the hour. Spend your coin wisely and no level need defeat you.',
  },
};

// Voiced "not enough coin" lines per merchant (used by the merchant modal).
export const BROKE_LINE = {
  inn: 'Come back when your purse is heavier, knight — the brew will keep.',
  gambler: 'No coin, no throw. Win a few levels and try your luck again.',
  blacksmith: 'Steel costs coin, knight. Fill your purse and the forge is yours.',
};
