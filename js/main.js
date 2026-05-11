import { createDeck, shuffleDeck } from './deck.js';
import { initUI } from './ui.js';
import { KlondikeGame } from './games/klondike.js';
import { SawayamaGame } from './games/sawayama.js';
import { YukonGame } from './games/yukon.js';

const GAMES = {
  klondike: KlondikeGame,
  sawayama: SawayamaGame,
  yukon: YukonGame,
};

const urlGame = new URLSearchParams(location.search).get('game');
startGame(GAMES[urlGame] ?? KlondikeGame);

function startGame(gameModule) {
  const deck = shuffleDeck(createDeck());
  gameModule.initGame(deck);
  initUI(gameModule);
}
