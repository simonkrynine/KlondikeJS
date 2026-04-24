import { createDeck, shuffleDeck } from './deck.js';
import { initGame } from './gameState.js';
import { renderGame, setupListeners } from './ui.js';
import { KlondikeGame } from './games/klondike.js';

const deck = shuffleDeck(createDeck());
KlondikeGame.initGame(deck);
window.KlondikeGame = KlondikeGame;

initGame();
renderGame();
setupListeners();
