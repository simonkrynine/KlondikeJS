import { createDeck, shuffleDeck } from './deck.js';
import { initUI } from './ui.js';
import { KlondikeGame } from './games/klondike.js';
import { SawayamaGame } from './games/sawayama.js';

buildPlaceholderLayout();

document.getElementById('btn-klondike').addEventListener('click', () => startGame(KlondikeGame));
document.getElementById('btn-sawayama').addEventListener('click', () => startGame(SawayamaGame));

function startGame(gameModule) {
  document.getElementById('menu-overlay').classList.add('hidden');
  document.querySelector('.controls').classList.remove('hidden');
  const deck = shuffleDeck(createDeck());
  gameModule.initGame(deck);
  initUI(gameModule);
}

function buildPlaceholderLayout() {
  const { controlRow, playArea } = KlondikeGame.getLayout();
  buildPlaceholderRow(document.getElementById('control-row'), controlRow);
  buildPlaceholderRow(document.getElementById('play-area'), playArea);
}

function buildPlaceholderRow(rowEl, pileIds) {
  for (const pileId of pileIds) {
    if (pileId === 'gap') {
      const gap = document.createElement('div');
      gap.className = 'gap';
      rowEl.appendChild(gap);
    } else {
      const type = pileId.startsWith('f') ? 'foundation'
        : pileId.startsWith('t') ? 'tableau'
        : pileId;
      const div = document.createElement('div');
      div.className = `pile-container pile-container--${type}`;
      const empty = document.createElement('div');
      empty.className = 'pile-empty';
      div.appendChild(empty);
      rowEl.appendChild(div);
    }
  }
}
