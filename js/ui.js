import { createDeck, shuffleDeck } from './deck.js';
import { createCardElement } from './card.js';

const CONFETTI_COLORS = ['#FFD700', '#FF4444', '#44BBFF', '#FF88FF', '#44FF88', '#FFAA00'];

let game;
let dragState = null;
let selectState = null;
let timerInterval = null;
let timerSeconds = 0;
let timerStarted = false;

// ── CSS helpers ───────────────────────────────────────────────────────────────

const getCssVar = (name) =>
  parseInt(getComputedStyle(document.documentElement).getPropertyValue(name));

// ── Stats & timer ─────────────────────────────────────────────────────────────

const updateStats = () => {
  const mins = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
  const secs = String(timerSeconds % 60).padStart(2, '0');
  document.getElementById('stats').textContent =
    `Moves: ${game.getMoveCount()} | Time: ${mins}:${secs}`;
};

const startTimer = () => {
  if (timerStarted) return;
  timerStarted = true;
  timerInterval = setInterval(() => {
    timerSeconds++;
    updateStats();
  }, 1000);
};

const stopTimer = () => {
  clearInterval(timerInterval);
  timerInterval = null;
};

// ── Post-move hook ────────────────────────────────────────────────────────────

const afterMove = () => {
  startTimer();
  renderGame();
  updateStats();
  if (game.checkWin()) showWinOverlay();
};

// ── Win overlay ───────────────────────────────────────────────────────────────

const showWinOverlay = () => {
  stopTimer();
  const overlay = document.getElementById('win-overlay');
  overlay.classList.remove('hidden');
  const container = document.getElementById('win-confetti');
  container.innerHTML = '';
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    piece.style.animationDuration = `${1.5 + Math.random() * 2}s`;
    piece.style.animationDelay = `${Math.random() * 2}s`;
    container.appendChild(piece);
  }
};

const startNewGame = () => {
  stopTimer();
  timerSeconds = 0;
  timerStarted = false;
  document.getElementById('win-overlay').classList.add('hidden');
  const deck = shuffleDeck(createDeck());
  game.initGame(deck);
  buildLayout();
  renderGame();
  updateStats();
};

// ── Layout builder ────────────────────────────────────────────────────────────

function buildLayout() {
  const { controlRow, playArea } = game.getLayout();
  const { title } = game.getConfig();

  document.title = title;
  document.querySelector('h1').textContent = title;

  buildRow(document.getElementById('control-row'), controlRow);
  buildRow(document.getElementById('play-area'), playArea);
}

function buildRow(rowEl, pileIds) {
  rowEl.innerHTML = '';
  for (const pileId of pileIds) {
    if (pileId === 'gap') {
      const gap = document.createElement('div');
      gap.className = 'gap';
      rowEl.appendChild(gap);
    } else {
      const div = document.createElement('div');
      div.id = `pile-${pileId}`;
      div.className = 'pile-container';
      div.dataset.pileId = pileId;
      rowEl.appendChild(div);
    }
  }
}

// ── Render ────────────────────────────────────────────────────────────────────

const FAN_COUNT = 3;

const renderGame = () => {
  for (const pile of game.getPiles()) renderPile(pile);
};

const renderPile = ({ id, type, cards, stackStyle, faceCount, isClickable, emptyLabel, badge }) => {
  const container = document.getElementById(`pile-${id}`);
  container.innerHTML = '';
  container.className = `pile-container pile-container--${type}`;
  container.style.height = '';

  if (cards.length === 0) {
    const el = document.createElement('div');
    el.className = `pile-empty${isClickable ? ' pile-empty--clickable' : ''}`;
    el.textContent = emptyLabel;
    if (isClickable) el.dataset.pileId = id;
    container.appendChild(el);
    return;
  }

  const faceUpStart = cards.length - faceCount;
  const cardH = getCssVar('--card-h');
  const faceUpOff = Math.round(cardH * 0.25);
  const faceDownOff = Math.round(cardH * 0.179);
  const fanOff = Math.round(cardH * 0.18);
  let top = 0;

  cards.forEach((card, index) => {
    const isFaceUp = index >= faceUpStart;
    const cardEl = createCardElement({ ...card, faceUp: isFaceUp });

    if (stackStyle === 'stacked') {
      cardEl.style.top = `${top}px`;
      top += isFaceUp ? faceUpOff : faceDownOff;
    } else if (stackStyle === 'fan') {
      const fromEnd = cards.length - 1 - index;
      cardEl.style.top = fromEnd < FAN_COUNT ? `${(FAN_COUNT - 1 - fromEnd) * fanOff}px` : '0';
    } else {
      cardEl.style.top = '0';
    }

    if (isFaceUp) {
      cardEl.draggable = true;
      cardEl.dataset.pileId = id;
      cardEl.dataset.cardIndex = index;
    }
    container.appendChild(cardEl);
  });

  if (stackStyle === 'stacked' && cards.length > 0) {
    const lastIsFaceUp = (cards.length - 1) >= faceUpStart;
    const lastOff = lastIsFaceUp ? faceUpOff : faceDownOff;
    container.style.height = `${(top - lastOff) + cardH}px`;
  }
  if (stackStyle === 'fan' && cards.length > 0) {
    const fanCount = Math.min(cards.length, FAN_COUNT);
    container.style.height = `${(fanCount - 1) * fanOff + cardH}px`;
  }

  if (badge != null) {
    const badgeEl = document.createElement('div');
    badgeEl.className = 'pile-badge';
    badgeEl.textContent = badge;
    container.appendChild(badgeEl);
  }
};

// ── Selection helpers ─────────────────────────────────────────────────────────

const clearSelection = () => {
  document.querySelectorAll('.card.selected').forEach(el => el.classList.remove('selected'));
  selectState = null;
};

const doSelect = (cardEl) => {
  const pileId = cardEl.dataset.pileId;
  const cardIndex = parseInt(cardEl.dataset.cardIndex, 10);
  const cards = game.getDraggableCards(pileId, cardIndex);
  if (cards.length === 0) return;

  selectState = { fromPileId: pileId, cards };
  const container = document.getElementById(`pile-${pileId}`);
  Array.from(container.children).slice(cardIndex).forEach(el => el.classList.add('selected'));
};

// ── Drag-and-drop ─────────────────────────────────────────────────────────────

const handleDragStart = (e) => {
  const cardEl = e.target.closest('[data-card-index]');
  if (!cardEl) return;

  clearSelection();
  const pileId = cardEl.dataset.pileId;
  const cardIndex = parseInt(cardEl.dataset.cardIndex, 10);
  const cards = game.getDraggableCards(pileId, cardIndex);
  if (cards.length === 0) { e.preventDefault(); return; }

  dragState = { cards, fromPileId: pileId };
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', '');
};

const handleDragOver = (e) => {
  if (!dragState) return;
  const containerEl = e.target.closest('.pile-container');
  if (!containerEl) return;
  const toPileId = containerEl.dataset.pileId;
  if (game.isValidMove(dragState.cards, dragState.fromPileId, toPileId)) {
    e.preventDefault();
    containerEl.classList.add('drop-valid');
  }
};

const handleDragLeave = (e) => {
  const containerEl = e.target.closest('.pile-container');
  if (containerEl && !containerEl.contains(e.relatedTarget)) {
    containerEl.classList.remove('drop-valid');
  }
};

const handleDrop = (e) => {
  e.preventDefault();
  const containerEl = e.target.closest('.pile-container');
  if (!containerEl || !dragState) return;

  const toPileId = containerEl.dataset.pileId;
  containerEl.classList.remove('drop-valid');

  if (game.isValidMove(dragState.cards, dragState.fromPileId, toPileId)) {
    game.executeMove(dragState.cards, dragState.fromPileId, toPileId);
    afterMove();
  }
  dragState = null;
};

const handleDragEnd = () => {
  document.querySelectorAll('.drop-valid').forEach(el => el.classList.remove('drop-valid'));
  dragState = null;
};

// ── Click handling ────────────────────────────────────────────────────────────

const handleClick = (e) => {
  if (e.detail >= 2) return;
  if (dragState) return;

  const cardEl = e.target.closest('[data-card-index]');
  const containerEl = e.target.closest('.pile-container');
  const pileEl = e.target.closest('[data-pile-id]');

  if (selectState) {
    const toPileId = containerEl?.dataset.pileId;
    if (toPileId && game.isValidMove(selectState.cards, selectState.fromPileId, toPileId)) {
      game.executeMove(selectState.cards, selectState.fromPileId, toPileId);
      selectState = null;
      afterMove();
      return;
    }
    clearSelection();
    if (cardEl) {
      doSelect(cardEl);
    } else if (pileEl) {
      const changed = game.onPileClick(pileEl.dataset.pileId);
      if (changed) afterMove();
    }
    return;
  }

  if (cardEl) {
    doSelect(cardEl);
    return;
  }

  if (pileEl) {
    const changed = game.onPileClick(pileEl.dataset.pileId);
    if (changed) afterMove();
  }
};

// ── Double-click auto-move ────────────────────────────────────────────────────

const handleDblClick = (e) => {
  const cardEl = e.target.closest('[data-card-index]');
  if (!cardEl) return;

  const pileId = cardEl.dataset.pileId;
  const cardIndex = parseInt(cardEl.dataset.cardIndex, 10);
  const cards = game.getDraggableCards(pileId, cardIndex);
  if (cards.length === 0) return;

  const target = game.getAutoMoveTarget(cards, pileId);
  if (target && game.isValidMove(cards, pileId, target)) {
    clearSelection();
    game.executeMove(cards, pileId, target);
    afterMove();
  }
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Initialises the UI with a game module and starts rendering.
 * @param {object} gameModule - implements the game module API
 */
export function initUI(gameModule) {
  game = gameModule;
  buildLayout();
  setupListeners();
  renderGame();
  updateStats();
}

function setupListeners() {
  document.getElementById('btn-new-game').addEventListener('click', startNewGame);
  document.getElementById('btn-undo').addEventListener('click', () => {
    if (game.undoLastMove()) {
      renderGame();
      updateStats();
    }
  });
  document.getElementById('btn-play-again').addEventListener('click', startNewGame);

  document.addEventListener('dragstart', handleDragStart);
  document.addEventListener('dragover', handleDragOver);
  document.addEventListener('dragleave', handleDragLeave);
  document.addEventListener('drop', handleDrop);
  document.addEventListener('dragend', handleDragEnd);

  document.addEventListener('dblclick', handleDblClick);
  document.addEventListener('click', handleClick);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') clearSelection();
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (game.undoLastMove()) {
        renderGame();
        updateStats();
      }
    }
  });
}
