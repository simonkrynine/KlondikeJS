import { createDeck, shuffleDeck } from './deck.js';
import { createCardElement } from './card.js';

const CONFETTI_SUITS = ['♠', '♥', '♦', '♣'];
const CONFETTI_SUIT_COLORS = { '♥': '#2e8f7a', '♦': '#2e8f7a', '♠': '#d4ede8', '♣': '#d4ede8' };

// active game module
let game;

// HTML5 drag state
let dragState = null;

// click-to-select state
let selectState = null;

// timer
let timerInterval = null;
let timerSeconds = 0;
let timerStarted = false;

// one-time listener guard
let listenersAttached = false;

// touch drag state
let touchDragState = null;
let touchCloneEl = null;

// double-tap detection
let lastTapTime = 0;
let lastTapTarget = null;

const DRAG_THRESHOLD = 5;
const DOUBLE_TAP_DELAY = 300;

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

// ── FLIP animation ────────────────────────────────────────────────────────────

const captureCardPositions = () => {
  const positions = {};
  document.querySelectorAll('.card[data-suit]').forEach(el => {
    positions[el.dataset.suit + el.dataset.rank] = el.getBoundingClientRect();
  });
  return positions;
};

const animateCardMoves = (snapshot) => {
  const movers = [];
  document.querySelectorAll('.card[data-suit]').forEach(el => {
    const key = el.dataset.suit + el.dataset.rank;
    const before = snapshot[key];
    if (!before) return;
    const after = el.getBoundingClientRect();
    const dx = before.left - after.left;
    const dy = before.top - after.top;
    if (dx === 0 && dy === 0) return;
    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    movers.push(el);
  });
  if (movers.length === 0) return;
  movers[0].getBoundingClientRect();
  movers.forEach(el => {
    el.style.transition = 'transform 150ms ease-in-out';
    el.style.transform = '';
  });
};

// ── Post-move hook ────────────────────────────────────────────────────────────

const afterMove = () => {
  startTimer();
  const snapshot = captureCardPositions();
  renderGame();
  updateStats();
  animateCardMoves(snapshot);
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
    const suit = CONFETTI_SUITS[Math.floor(Math.random() * CONFETTI_SUITS.length)];
    piece.textContent = suit;
    piece.style.color = CONFETTI_SUIT_COLORS[suit];
    piece.style.left = `${Math.random() * 100}vw`;
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

const positionFlat = (cardEls) => {
  cardEls.forEach(el => { el.style.top = '0'; });
};

const positionStacked = (container, cardEls, faceUpStart, cardH, faceUpOff, faceDownOff) => {
  let top = 0;
  cardEls.forEach((el, index) => {
    el.style.top = `${top}px`;
    top += index >= faceUpStart ? faceUpOff : faceDownOff;
  });
  if (cardEls.length > 0) {
    const lastIsFaceUp = (cardEls.length - 1) >= faceUpStart;
    const lastOff = lastIsFaceUp ? faceUpOff : faceDownOff;
    container.style.height = `${(top - lastOff) + cardH}px`;
  }
};

const positionFan = (container, cardEls, cardW, fanOff) => {
  const len = cardEls.length;
  cardEls.forEach((el, index) => {
    const fromEnd = len - 1 - index;
    if (fromEnd < FAN_COUNT) el.style.left = `${(FAN_COUNT - 1 - fromEnd) * fanOff}px`;
  });
  if (len > 0) {
    container.style.width = `${(Math.min(len, FAN_COUNT) - 1) * fanOff + cardW}px`;
  }
};

const renderGame = () => {
  for (const pile of game.getPiles()) renderPile(pile);
};

const renderPile = ({ id, type, cards, stackStyle, faceCount, isClickable, emptyLabel, badge }) => {
  const container = document.getElementById(`pile-${id}`);
  container.innerHTML = '';
  container.className = `pile-container pile-container--${type}`;
  container.style.height = '';
  container.style.width = '';

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
  const cardW = getCssVar('--card-w');
  const faceUpOff = Math.round(cardH * 0.25);
  const faceDownOff = Math.round(cardH * 0.179);
  const fanOff = Math.round(cardW * 0.25);

  const cardEls = cards.map((card, index) => {
    const isFaceUp = index >= faceUpStart;
    const cardEl = createCardElement({ ...card, faceUp: isFaceUp });
    if (isFaceUp) {
      cardEl.draggable = true;
      cardEl.dataset.pileId = id;
      cardEl.dataset.cardIndex = index;
    }
    return cardEl;
  });

  if (stackStyle === 'stacked') positionStacked(container, cardEls, faceUpStart, cardH, faceUpOff, faceDownOff);
  else if (stackStyle === 'fan') positionFan(container, cardEls, cardW, fanOff);
  else positionFlat(cardEls);

  cardEls.forEach(el => container.appendChild(el));

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

  dragState = { fromPileId: pileId, cards };
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

// ── Touch drag-and-drop ───────────────────────────────────────────────────────

const handleTouchStart = (e) => {
  const cardEl = e.target.closest('[data-card-index]');
  if (!cardEl) return;

  const touch = e.touches[0];
  const pileId = cardEl.dataset.pileId;
  const cardIndex = parseInt(cardEl.dataset.cardIndex, 10);
  const cards = game.getDraggableCards(pileId, cardIndex);
  if (cards.length === 0) return;

  const rect = cardEl.getBoundingClientRect();
  touchDragState = {
    cards,
    fromPileId: pileId,
    cardEl,
    startX: touch.clientX,
    startY: touch.clientY,
    offsetX: touch.clientX - rect.left,
    offsetY: touch.clientY - rect.top,
    hasDragged: false,
  };
};

const handleTouchMove = (e) => {
  if (!touchDragState) return;

  const touch = e.touches[0];
  const dx = touch.clientX - touchDragState.startX;
  const dy = touch.clientY - touchDragState.startY;

  if (!touchDragState.hasDragged) {
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    touchDragState.hasDragged = true;
    clearSelection();
    const rect = touchDragState.cardEl.getBoundingClientRect();
    touchCloneEl = touchDragState.cardEl.cloneNode(true);
    touchCloneEl.style.position = 'fixed';
    touchCloneEl.style.left = `${rect.left}px`;
    touchCloneEl.style.top = `${rect.top}px`;
    touchCloneEl.style.width = `${rect.width}px`;
    touchCloneEl.style.height = `${rect.height}px`;
    touchCloneEl.style.opacity = '0.85';
    touchCloneEl.style.pointerEvents = 'none';
    touchCloneEl.style.zIndex = '200';
    touchCloneEl.style.transform = 'scale(1.05)';
    touchCloneEl.style.transformOrigin = 'top left';
    touchCloneEl.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
    document.body.appendChild(touchCloneEl);
  }

  e.preventDefault();

  touchCloneEl.style.left = `${touch.clientX - touchDragState.offsetX}px`;
  touchCloneEl.style.top = `${touch.clientY - touchDragState.offsetY}px`;

  document.querySelectorAll('.drop-valid').forEach(el => el.classList.remove('drop-valid'));
  const elUnder = document.elementFromPoint(touch.clientX, touch.clientY);
  const containerEl = elUnder?.closest('.pile-container');
  if (containerEl) {
    const toPileId = containerEl.dataset.pileId;
    if (game.isValidMove(touchDragState.cards, touchDragState.fromPileId, toPileId)) {
      containerEl.classList.add('drop-valid');
    }
  }
};

const handleTouchEnd = (e) => {
  if (!touchDragState) return;

  if (touchCloneEl) { touchCloneEl.remove(); touchCloneEl = null; }
  document.querySelectorAll('.drop-valid').forEach(el => el.classList.remove('drop-valid'));

  if (touchDragState.hasDragged) {
    const touch = e.changedTouches[0];
    const elUnder = document.elementFromPoint(touch.clientX, touch.clientY);
    const containerEl = elUnder?.closest('.pile-container');
    if (containerEl) {
      const toPileId = containerEl.dataset.pileId;
      if (game.isValidMove(touchDragState.cards, touchDragState.fromPileId, toPileId)) {
        game.executeMove(touchDragState.cards, touchDragState.fromPileId, toPileId);
        touchDragState = null;
        afterMove();
        return;
      }
    }
  }

  touchDragState = null;
};

const handleTouchCancel = () => {
  if (touchCloneEl) { touchCloneEl.remove(); touchCloneEl = null; }
  document.querySelectorAll('.drop-valid').forEach(el => el.classList.remove('drop-valid'));
  touchDragState = null;
};

// ── Click handling ────────────────────────────────────────────────────────────

// Returns true if a double-tap auto-move was executed (caller should early-return).
// Always updates lastTapTime/lastTapTarget as a side-effect.
const tryDoubleTap = (cardEl, now) => {
  if (cardEl && now - lastTapTime < DOUBLE_TAP_DELAY && lastTapTarget === cardEl) {
    lastTapTime = 0;
    lastTapTarget = null;
    const pileId = cardEl.dataset.pileId;
    const cardIndex = parseInt(cardEl.dataset.cardIndex, 10);
    const cards = game.getDraggableCards(pileId, cardIndex);
    if (cards.length > 0) {
      const target = game.getAutoMoveTarget(cards, pileId);
      if (target && game.isValidMove(cards, pileId, target)) {
        clearSelection();
        game.executeMove(cards, pileId, target);
        afterMove();
        return true;
      }
    }
  }
  lastTapTime = cardEl ? now : 0;
  lastTapTarget = cardEl ?? null;
  return false;
};

// Returns true if selection was active and fully handled (caller should early-return).
const tryCompleteSelection = (containerEl, cardEl, pileEl) => {
  if (!selectState) return false;
  const toPileId = containerEl?.dataset.pileId;
  if (toPileId && game.isValidMove(selectState.cards, selectState.fromPileId, toPileId)) {
    game.executeMove(selectState.cards, selectState.fromPileId, toPileId);
    selectState = null;
    afterMove();
    return true;
  }
  clearSelection();
  if (cardEl) {
    doSelect(cardEl);
  } else if (pileEl) {
    const changed = game.onPileClick(pileEl.dataset.pileId);
    if (changed) afterMove();
  }
  return true;
};

const handleClick = (e) => {
  if (e.detail >= 2) return;
  if (dragState || touchDragState?.hasDragged) return;

  const cardEl = e.target.closest('[data-card-index]');
  const containerEl = e.target.closest('.pile-container');
  const pileEl = e.target.closest('[data-pile-id]');

  if (tryDoubleTap(cardEl, Date.now())) return;
  if (tryCompleteSelection(containerEl, cardEl, pileEl)) return;

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

const REQUIRED_METHODS = [
  'initGame', 'getLayout', 'getConfig', 'getPiles', 'getDraggableCards',
  'getAutoMoveTarget', 'isValidMove', 'executeMove', 'onPileClick',
  'checkWin', 'getMoveCount',
];

/**
 * Initialises the UI with a game module and starts rendering.
 * @param {object} gameModule - implements the game module API
 */
export function initUI(gameModule) {
  const missing = REQUIRED_METHODS.filter(m => typeof gameModule[m] !== 'function');
  if (missing.length > 0) throw new Error(`Game module missing: ${missing.join(', ')}`);
  game = gameModule;
  stopTimer();
  timerSeconds = 0;
  timerStarted = false;
  document.getElementById('win-overlay').classList.add('hidden');
  buildLayout();
  setupListeners();
  renderGame();
  updateStats();
}

function setupListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  document.getElementById('btn-new-game').addEventListener('click', startNewGame);
  document.getElementById('btn-play-again').addEventListener('click', startNewGame);

  document.addEventListener('dragstart', handleDragStart);
  document.addEventListener('dragover', handleDragOver);
  document.addEventListener('dragleave', handleDragLeave);
  document.addEventListener('drop', handleDrop);
  document.addEventListener('dragend', handleDragEnd);

  document.addEventListener('touchstart', handleTouchStart, { passive: true });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd);
  document.addEventListener('touchcancel', handleTouchCancel);

  document.addEventListener('dblclick', handleDblClick);
  document.addEventListener('click', handleClick);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') clearSelection();
  });
}
