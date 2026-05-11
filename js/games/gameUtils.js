// ── Shared constants ──────────────────────────────────────────────────────────

/** @type {string[]} */
export const SUITS = ['♠', '♥', '♦', '♣'];

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
