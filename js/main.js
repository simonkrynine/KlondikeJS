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
  buildPlaceholderRow(document.getElementById('control-row'), [
    { type: 'stock' }, { type: 'waste' }, 'gap',
    { type: 'foundation' }, { type: 'foundation' }, { type: 'foundation' }, { type: 'foundation' },
  ]);
  buildPlaceholderRow(document.getElementById('play-area'), [
    { type: 'tableau' }, { type: 'tableau' }, { type: 'tableau' }, { type: 'tableau' },
    { type: 'tableau' }, { type: 'tableau' }, { type: 'tableau' },
  ]);
}

function buildPlaceholderRow(rowEl, items) {
  for (const item of items) {
    if (item === 'gap') {
      const gap = document.createElement('div');
      gap.className = 'gap';
      rowEl.appendChild(gap);
    } else {
      const div = document.createElement('div');
      div.className = `pile-container pile-container--${item.type}`;
      const empty = document.createElement('div');
      empty.className = 'pile-empty';
      div.appendChild(empty);
      rowEl.appendChild(div);
    }
  }
}
