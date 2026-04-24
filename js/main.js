import { createDeck, shuffleDeck } from './deck.js';
import { initUI } from './ui.js';
import { KlondikeGame } from './games/klondike.js';

const deck = shuffleDeck(createDeck());
KlondikeGame.initGame(deck);
initUI(KlondikeGame);
