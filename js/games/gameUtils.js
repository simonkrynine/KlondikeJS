// ── Shared constants ──────────────────────────────────────────────────────────

/** @type {string[]} */
export const SUITS = ['♠', '♥', '♦', '♣'];

/** Maximum number of undo snapshots retained. */
export const UNDO_DEPTH = 3;

// ── Shared validation ─────────────────────────────────────────────────────────

/**
 * Returns true if card can legally move onto the matching foundation pile.
 * @param {Object} card
 * @param {Object[][]} foundations
 * @returns {boolean}
 */
export const isValidFoundationMove = (card, foundations) => {
  const foundation = foundations[SUITS.indexOf(card.suit)];
  if (foundation.length === 0) return card.rankValue === 1;
  return foundation[foundation.length - 1].rankValue === card.rankValue - 1;
};

/**
 * Returns true if all four foundation piles hold 13 cards.
 * @param {Object[][]} foundations
 * @returns {boolean}
 */
export const checkWin = (foundations) => foundations.every(f => f.length === 13);

/**
 * Returns the foundation pile ID for auto-move, or null if not eligible.
 * @param {Object[]} cards
 * @param {string} fromPileId
 * @param {Object[][]} foundations
 * @returns {string|null}
 */
export const getAutoMoveTarget = (cards, fromPileId, foundations) => {
  if (cards.length !== 1) return null;
  const card = cards[0];
  if (!isValidFoundationMove(card, foundations)) return null;
  return `f${SUITS.indexOf(card.suit)}`;
};

// ── Shared undo helpers ───────────────────────────────────────────────────────

/**
 * Deep-clones the common game state fields plus any extra fields provided.
 * @param {Object} state - game state object (must have tableau, foundations, stock, waste, moveCount)
 * @param {Object} [extraFields={}] - additional state fields to snapshot (e.g. freeCell)
 * @returns {Object}
 */
export const takeSnapshot = (state, extraFields = {}) =>
  JSON.parse(JSON.stringify({
    tableau: state.tableau,
    foundations: state.foundations,
    stock: state.stock,
    waste: state.waste,
    moveCount: state.moveCount,
    ...extraFields,
  }));

/**
 * Pushes a snapshot onto the undo stack, evicting the oldest if at capacity.
 * @param {Object} state - game state object (must have undoStack)
 * @param {Object} [extraFields={}] - forwarded to takeSnapshot
 */
export const saveUndo = (state, extraFields = {}) => {
  if (state.undoStack.length >= UNDO_DEPTH) state.undoStack.shift();
  state.undoStack.push(takeSnapshot(state, extraFields));
};

// ── Loc builder ───────────────────────────────────────────────────────────────

/**
 * Factory methods for move descriptor objects used in moveCard().
 * Each method returns a plain object identifying pile type, index, and card position.
 */
export const Loc = {
  /** @param {number} index @param {number} [cardIndex] */
  tableau: (index, cardIndex) => ({ type: 'tableau', index, cardIndex }),
  /** @returns {{ type: 'waste' }} */
  waste: () => ({ type: 'waste' }),
  /**
   * Pass index for a source foundation; omit for a destination (index derived from card suit).
   * @param {number} [index]
   */
  foundation: (index) => (index !== undefined ? { type: 'foundation', index } : { type: 'foundation' }),
  /** @returns {{ type: 'freecell' }} */
  freecell: () => ({ type: 'freecell' }),
};
