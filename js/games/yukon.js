import {
  SUITS,
  isValidFoundationMove, checkWin, getAutoMoveTarget as getAutoMoveTargetUtil,
  Loc,
} from './gameUtils.js';

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  tableau: [],
  foundations: [],
  moveCount: 0,
};

// ── Validation ────────────────────────────────────────────────────────────────

const isValidTableauMove = (card, col) => {
  const column = state.tableau[col];
  if (column.length === 0) return card.rankValue === 13;
  const top = column[column.length - 1];
  return top.faceUp && top.rankValue === card.rankValue + 1 && top.color !== card.color;
};

// ── State mutations ───────────────────────────────────────────────────────────

const moveCard = (from, to) => {
  let cards;
  if (from.type === 'tableau') {
    cards = state.tableau[from.index].splice(from.cardIndex);
    const col = state.tableau[from.index];
    if (col.length > 0 && !col[col.length - 1].faceUp) col[col.length - 1].faceUp = true;
  } else {
    cards = [state.foundations[from.index].pop()];
  }

  if (to.type === 'tableau') {
    cards.forEach(c => state.tableau[to.index].push(c));
  } else {
    state.foundations[SUITS.indexOf(cards[0].suit)].push(cards[0]);
  }
  state.moveCount++;
};

// ── Private helpers ───────────────────────────────────────────────────────────

const countFaceUp = (cards) => {
  let count = 0;
  for (let i = cards.length - 1; i >= 0; i--) {
    if (cards[i].faceUp) count++;
    else break;
  }
  return count;
};

// ── Game Module API ───────────────────────────────────────────────────────────

/**
 * Yukon Solitaire game module implementing the standard game API.
 * Differences from Klondike: no stock or waste; all 52 cards dealt into
 * 7 columns with the top 5 face-up; any face-up card lifts all cards above
 * it regardless of sequence validity; empty columns accept Kings only.
 */
export const YukonGame = {

  /**
   * Initialise a new game from a freshly shuffled deck.
   * Column depths: [1, 6, 7, 8, 9, 10, 11]. Top 5 cards per column face-up.
   * @param {Object[]} deck - 52 card objects from deck.js
   */
  initGame(deck) {
    state.tableau = Array.from({ length: 7 }, () => []);
    state.foundations = Array.from({ length: 4 }, () => []);
    state.moveCount = 0;

    const sizes = [1, 6, 7, 8, 9, 10, 11];
    let cardIndex = 0;
    for (let col = 0; col < 7; col++) {
      const size = sizes[col];
      const faceUpStart = Math.max(0, size - 5);
      for (let row = 0; row < size; row++) {
        state.tableau[col].push({ ...deck[cardIndex++], faceUp: row >= faceUpStart });
      }
    }
  },

  /**
   * @returns {{ controlRow: string[], playArea: string[] }}
   */
  getLayout() {
    return {
      controlRow: ['gap', 'gap', 'gap', 'f0', 'f1', 'f2', 'f3'],
      playArea: ['t0', 't1', 't2', 't3', 't4', 't5', 't6'],
    };
  },

  /**
   * @returns {{ id: string, title: string }}
   */
  getConfig() {
    return { id: 'yukon', title: 'Yukon Solitaire' };
  },

  /**
   * Current state of every pile as an array of descriptors.
   * @returns {PileDescriptor[]}
   */
  getPiles() {
    return [
      ...state.foundations.map((pile, i) => ({
        id: `f${i}`,
        type: 'foundation',
        cards: [...pile],
        stackStyle: 'flat',
        faceCount: pile.length > 0 ? 1 : 0,
        isClickable: false,
        emptyLabel: 'A',
      })),
      ...state.tableau.map((col, i) => ({
        id: `t${i}`,
        type: 'tableau',
        cards: [...col],
        stackStyle: 'stacked',
        faceCount: countFaceUp(col),
        isClickable: false,
        emptyLabel: '',
      })),
    ];
  },

  /**
   * Returns draggable cards starting at cardIndex, or [] if not draggable.
   * Any face-up card lifts all cards above it — no sequence check.
   * @param {string} pileId
   * @param {number} cardIndex
   * @returns {Object[]}
   */
  getDraggableCards(pileId, cardIndex) {
    if (pileId.startsWith('t')) {
      const col = parseInt(pileId.slice(1));
      const cards = state.tableau[col];
      if (cardIndex < 0 || cardIndex >= cards.length || !cards[cardIndex].faceUp) return [];
      return cards.slice(cardIndex);
    }
    if (pileId.startsWith('f')) {
      const idx = parseInt(pileId.slice(1));
      const pile = state.foundations[idx];
      if (pile.length === 0 || cardIndex !== pile.length - 1) return [];
      return [pile[pile.length - 1]];
    }
    return [];
  },

  /**
   * Returns a foundation pile ID for auto-move, or null if none exists.
   * @param {Object[]} cards
   * @param {string} fromPileId
   * @returns {string|null}
   */
  getAutoMoveTarget(cards, fromPileId) {
    return getAutoMoveTargetUtil(cards, fromPileId, state.foundations);
  },

  /**
   * Pure move validation — does not mutate state.
   * Tableau: only cards[0] (bottom of group) must satisfy rank/colour rule.
   * @param {Object[]} cards
   * @param {string} fromPileId
   * @param {string} toPileId
   * @returns {boolean}
   */
  isValidMove(cards, fromPileId, toPileId) {
    if (toPileId.startsWith('t')) {
      return isValidTableauMove(cards[0], parseInt(toPileId.slice(1)));
    }
    if (toPileId.startsWith('f')) {
      return cards.length === 1 && isValidFoundationMove(cards[0], state.foundations);
    }
    return false;
  },

  /**
   * Execute a validated move. Mutates state and flips newly exposed cards.
   * @param {Object[]} cards
   * @param {string} fromPileId
   * @param {string} toPileId
   */
  executeMove(cards, fromPileId, toPileId) {
    let from;
    if (fromPileId.startsWith('t')) {
      const col = parseInt(fromPileId.slice(1));
      from = Loc.tableau(col, state.tableau[col].indexOf(cards[0]));
    } else {
      from = Loc.foundation(parseInt(fromPileId.slice(1)));
    }

    const to = toPileId.startsWith('t')
      ? Loc.tableau(parseInt(toPileId.slice(1)))
      : Loc.foundation();

    moveCard(from, to);
  },

  /**
   * No stock — pile clicks are a no-op in Yukon.
   * @param {string} pileId
   * @returns {boolean}
   */
  onPileClick(pileId) {
    return false;
  },

  /**
   * @returns {boolean} true if all 52 cards are on the foundations
   */
  checkWin() {
    return checkWin(state.foundations);
  },

  /**
   * @returns {number} current move count
   */
  getMoveCount() {
    return state.moveCount;
  },
};
