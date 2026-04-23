import { gameState, initGame, drawFromStock, moveCard, undoLastMove, isValidTableauMove, isValidFoundationMove, checkWin } from './gameState.js';
import { createCardElement } from './card.js';

const SUIT_LABELS = ['♠', '♥', '♦', '♣'];
const CONFETTI_COLORS = ['#FFD700', '#FF4444', '#44BBFF', '#FF88FF', '#44FF88', '#FFAA00'];

let dragState = null;
let selectState = null;
let timerInterval = null;

// ── CSS helpers ───────────────────────────────────────────────────────────────

const getCssVar = (name) =>
  parseInt(getComputedStyle(document.documentElement).getPropertyValue(name));

// ── Stats & timer ─────────────────────────────────────────────────────────────

const updateStats = () => {
  const mins = String(Math.floor(gameState.timerSeconds / 60)).padStart(2, '0');
  const secs = String(gameState.timerSeconds % 60).padStart(2, '0');
  document.getElementById('stats').textContent =
    `Moves: ${gameState.moveCount} | Time: ${mins}:${secs}`;
};

const startTimer = () => {
  if (gameState.timerStarted) return;
  gameState.timerStarted = true;
  timerInterval = setInterval(() => {
    gameState.timerSeconds++;
    updateStats();
  }, 1000);
};

const stopTimer = () => {
  clearInterval(timerInterval);
  timerInterval = null;
};

// ── Post-move hooks ───────────────────────────────────────────────────────────

const afterMove = () => {
  startTimer();
  renderGame();
  updateStats();
  if (checkWin()) showWinOverlay();
};

const afterDraw = () => {
  startTimer();
  renderGame();
  updateStats();
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
  document.getElementById('win-overlay').classList.add('hidden');
  initGame();
  renderGame();
  updateStats();
};

// ── Undo ──────────────────────────────────────────────────────────────────────

const doUndo = () => {
  undoLastMove();
  renderGame();
  updateStats();
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Renders the full game state to the DOM.
 */
export const renderGame = () => {
  renderStock();
  renderWaste();
  renderFoundations();
  renderTableau();
};

/**
 * Attaches all event listeners. Call once after initial renderGame().
 */
export const setupListeners = () => {
  document.getElementById('stock').addEventListener('click', () => {
    selectState = null;
    drawFromStock();
    afterDraw();
  });

  document.getElementById('btn-new-game').addEventListener('click', startNewGame);

  document.getElementById('btn-undo').addEventListener('click', doUndo);

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
      doUndo();
    }
  });
};

// ── Shared helpers ────────────────────────────────────────────────────────────

const getDropTarget = (el) =>
  el.closest('.tableau-col') || el.closest('.foundation');

const isValidDrop = (target, state = dragState) => {
  if (!state) return false;
  if (target.classList.contains('tableau-col')) {
    const col = parseInt(target.id.replace('tableau-', ''));
    return isValidTableauMove(state.cards[0], col);
  }
  if (target.classList.contains('foundation')) {
    return state.cards.length === 1 && isValidFoundationMove(state.cards[0]);
  }
  return false;
};

// ── Drag-and-drop ─────────────────────────────────────────────────────────────

const handleDragStart = (e) => {
  const card = e.target.closest('[draggable="true"]');
  if (!card) return;

  clearSelection();
  const { fromType, fromCol, fromCardIndex, fromIndex } = card.dataset;

  if (fromType === 'tableau') {
    const col = parseInt(fromCol);
    const ci = parseInt(fromCardIndex);
    dragState = {
      from: { type: 'tableau', index: col, cardIndex: ci },
      cards: gameState.tableau[col].slice(ci),
    };
  } else if (fromType === 'waste') {
    dragState = {
      from: { type: 'waste' },
      cards: [gameState.waste[gameState.waste.length - 1]],
    };
  } else if (fromType === 'foundation') {
    const idx = parseInt(fromIndex);
    dragState = {
      from: { type: 'foundation', index: idx },
      cards: [gameState.foundations[idx][gameState.foundations[idx].length - 1]],
    };
  }

  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', '');
};

const handleDragOver = (e) => {
  if (!dragState) return;
  const target = getDropTarget(e.target);
  if (target && isValidDrop(target)) {
    e.preventDefault();
    target.classList.add('drop-valid');
  }
};

const handleDragLeave = (e) => {
  const target = getDropTarget(e.target);
  if (target && !target.contains(e.relatedTarget)) {
    target.classList.remove('drop-valid');
  }
};

const handleDrop = (e) => {
  e.preventDefault();
  const target = getDropTarget(e.target);
  if (!target || !dragState || !isValidDrop(target)) return;

  target.classList.remove('drop-valid');

  const to = target.classList.contains('tableau-col')
    ? { type: 'tableau', index: parseInt(target.id.replace('tableau-', '')) }
    : { type: 'foundation' };

  moveCard(dragState.from, to);
  dragState = null;
  afterMove();
};

const handleDragEnd = () => {
  document.querySelectorAll('.drop-valid').forEach(el => el.classList.remove('drop-valid'));
  dragState = null;
};

// ── Click-to-select ───────────────────────────────────────────────────────────

const clearSelection = () => {
  document.querySelectorAll('.card.selected').forEach(el => el.classList.remove('selected'));
  selectState = null;
};

const doSelect = (cardEl) => {
  const { fromType, fromCol, fromCardIndex, fromIndex } = cardEl.dataset;

  if (fromType === 'tableau') {
    const col = parseInt(fromCol);
    const ci = parseInt(fromCardIndex);
    selectState = {
      from: { type: 'tableau', index: col, cardIndex: ci },
      cards: gameState.tableau[col].slice(ci),
    };
    const colEl = document.getElementById(`tableau-${col}`);
    Array.from(colEl.children).slice(ci).forEach(el => el.classList.add('selected'));
  } else if (fromType === 'waste') {
    selectState = {
      from: { type: 'waste' },
      cards: [gameState.waste[gameState.waste.length - 1]],
    };
    cardEl.classList.add('selected');
  } else if (fromType === 'foundation') {
    const idx = parseInt(fromIndex);
    selectState = {
      from: { type: 'foundation', index: idx },
      cards: [gameState.foundations[idx][gameState.foundations[idx].length - 1]],
    };
    cardEl.classList.add('selected');
  }
};

const handleClick = (e) => {
  if (e.detail >= 2) return;
  if (e.target.closest('#stock')) return;
  if (dragState) return;

  const cardEl = e.target.closest('.card[draggable]');
  const target = getDropTarget(e.target);

  if (selectState) {
    if (target && isValidDrop(target, selectState)) {
      const to = target.classList.contains('tableau-col')
        ? { type: 'tableau', index: parseInt(target.id.replace('tableau-', '')) }
        : { type: 'foundation' };
      moveCard(selectState.from, to);
      selectState = null;
      afterMove();
    } else if (cardEl) {
      clearSelection();
      doSelect(cardEl);
    } else {
      clearSelection();
    }
    return;
  }

  if (cardEl) doSelect(cardEl);
};

// ── Double-click auto-move ────────────────────────────────────────────────────

const handleDblClick = (e) => {
  if (e.target.closest('#stock')) return;
  const cardEl = e.target.closest('.card[draggable]');
  if (!cardEl) return;

  const { fromType, fromCol, fromCardIndex } = cardEl.dataset;
  let card, from;

  if (fromType === 'tableau') {
    const col = parseInt(fromCol);
    const ci = parseInt(fromCardIndex);
    if (ci !== gameState.tableau[col].length - 1) return;
    card = gameState.tableau[col][ci];
    from = { type: 'tableau', index: col, cardIndex: ci };
  } else if (fromType === 'waste') {
    card = gameState.waste[gameState.waste.length - 1];
    from = { type: 'waste' };
  } else {
    return;
  }

  if (!isValidFoundationMove(card)) return;
  clearSelection();
  moveCard(from, { type: 'foundation' });
  afterMove();
};

// ── Render functions ──────────────────────────────────────────────────────────

const renderStock = () => {
  const el = document.getElementById('stock');
  el.innerHTML = '';
  if (gameState.stock.length === 0) {
    el.textContent = '↺';
    el.classList.add('empty');
  } else {
    el.classList.remove('empty');
    el.appendChild(createCardElement({ faceUp: false }));
  }
};

const renderWaste = () => {
  const el = document.getElementById('waste');
  el.innerHTML = '';
  if (gameState.waste.length > 0) {
    const cardEl = createCardElement(gameState.waste[gameState.waste.length - 1]);
    cardEl.draggable = true;
    cardEl.dataset.fromType = 'waste';
    el.appendChild(cardEl);
  }
};

const renderFoundations = () => {
  gameState.foundations.forEach((pile, i) => {
    const el = document.getElementById(`foundation-${i}`);
    el.innerHTML = '';
    if (pile.length > 0) {
      const cardEl = createCardElement(pile[pile.length - 1]);
      cardEl.draggable = true;
      cardEl.dataset.fromType = 'foundation';
      cardEl.dataset.fromIndex = String(i);
      el.appendChild(cardEl);
    } else {
      el.textContent = SUIT_LABELS[i];
    }
  });
};

const renderTableau = () => {
  const cardH = getCssVar('--card-h');
  const faceUpOff = Math.round(cardH * 0.25);
  const faceDownOff = Math.round(cardH * 0.179);

  gameState.tableau.forEach((col, i) => {
    const el = document.getElementById(`tableau-${i}`);
    el.innerHTML = '';
    let top = 0;
    col.forEach((card, j) => {
      const cardEl = createCardElement(card);
      cardEl.style.top = `${top}px`;
      if (card.faceUp) {
        cardEl.draggable = true;
        cardEl.dataset.fromType = 'tableau';
        cardEl.dataset.fromCol = String(i);
        cardEl.dataset.fromCardIndex = String(j);
      }
      el.appendChild(cardEl);
      top += card.faceUp ? faceUpOff : faceDownOff;
    });
    if (col.length > 0) {
      const last = col[col.length - 1];
      const lastTop = top - (last.faceUp ? faceUpOff : faceDownOff);
      el.style.height = `${lastTop + cardH}px`;
    }
  });
};
