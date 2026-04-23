import { gameState, drawFromStock, moveCard, isValidTableauMove, isValidFoundationMove } from './gameState.js';
import { createCardElement } from './card.js';

const SUIT_LABELS = ['♠', '♥', '♦', '♣'];

let dragState = null;
let selectState = null;

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
    renderGame();
  });

  document.addEventListener('dragstart', handleDragStart);
  document.addEventListener('dragover', handleDragOver);
  document.addEventListener('dragleave', handleDragLeave);
  document.addEventListener('drop', handleDrop);
  document.addEventListener('dragend', handleDragEnd);

  document.addEventListener('click', handleClick);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') clearSelection();
  });
};

// ── Shared helpers ────────────────────────────────────────────────────────────

const getDropTarget = (el) =>
  el.closest('.tableau-col') || el.closest('.foundation');

/** Works for both dragState and selectState via the optional state param. */
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
  e.dataTransfer.setData('text/plain', ''); // required for Firefox
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
  renderGame();
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
    // Highlight the full sequence
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
  // Stock has its own listener; don't double-handle it
  if (e.target.closest('#stock')) return;
  // Ignore clicks that were part of a drag operation
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
      renderGame();
    } else if (cardEl) {
      // Clicked a different card — deselect and re-select
      clearSelection();
      doSelect(cardEl);
    } else {
      clearSelection();
    }
    return;
  }

  if (cardEl) doSelect(cardEl);
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
      top += card.faceUp ? 28 : 20;
    });
    if (col.length > 0) {
      const last = col[col.length - 1];
      const lastTop = top - (last.faceUp ? 28 : 20);
      el.style.height = `${lastTop + 112}px`;
    }
  });
};
