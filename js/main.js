import { createDeck, shuffleDeck } from './deck.js';
import { initUI } from './ui.js';
import { SawayamaGame } from './games/sawayama.js';

const deck = shuffleDeck(createDeck());
SawayamaGame.initGame(deck);
initUI(SawayamaGame);
