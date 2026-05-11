import {
  SUITS,
  isValidFoundationMove, checkWin, getAutoMoveTarget as getAutoMoveTargetUtil,
  Loc,
} from './gameUtils.js';

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  tableau: [],
  foundations: [],
  stock: [],
  waste: [],
  freeCell: null,
  freeCellActive: false,
  moveCount: 0,
};

// ── Validation ────────────────────────────────────────────────────────────────

const isValidTableauMove = (card, col) => {
  const column = state.tableau[col];
  if (column.length === 0) return true;
  const top = column[column.length - 1];
  return top.rankValue === card.rankValue + 1 && top.color !== card.color;
};

// ── State mutations ───────────────────────────────────────────────────────────

const moveCard = (from, to) => {
  let cards;
  if (from.type === 'tableau') {
    cards = state.tableau[from.index].splice(from.cardIndex);
  } else if (from.type === 'waste') {
    cards = [state.waste.pop()];
  } else if (from.type === 'foundation') {
    cards = [state.foundations[from.index].pop()];
  } else if (from.type === 'freecell') {
    cards = [state.freeCell];
    state.freeCell = null;
  }

  if (to.type === 'tableau') {
    cards.forEach(c => state.tableau[to.index].push(c));
  } else if (to.type === 'foundation') {
    state.foundations[SUITS.indexOf(cards[0].suit)].push(cards[0]);
  } else if (to.type === 'freecell') {
    state.freeCell = cards[0];
  }
  state.moveCount++;
};

const drawFromStock = () => {
  if (state.stock.length === 0) return false;
  const count = Math.min(3, state.stock.length);
  for (let i = 0; i < count; i++) {
    const card = state.stock.pop();
    card.faceUp = true;
    state.waste.push(card);
  }
  if (state.stock.length === 0) state.freeCellActive = true;
  state.moveCount++;
  return true;
};

// ── Game Module API ───────────────────────────────────────────────────────────

/**
 * Sawayama Solitaire game module implementing the standard game API.
 * Differences from Klondike: all tableau cards dealt face-up, empty columns
 * accept any card/sequence, stock deals 3 cards with no recycle, and the
 * stock space transforms into a free cell once the stock is exhausted.
 */
export const SawayamaGame = {

  /**
   * @returns {{ id: string, title: string }}
   */
  getConfig() {
    return { id: 'sawayama', title: 'Sawayama Solitaire' };
  },

  /**
   * @returns {{ controlRow: string[], playArea: string[] }}
   */
  getLayout() {
    return {
      controlRow: ['stock', 'waste', 'gap', 'f0', 'f1', 'f2', 'f3'],
      playArea: ['t0', 't1', 't2', 't3', 't4', 't5', 't6'],
    };
  },

  /**
   * Initialise a new game from a freshly shuffled deck.
   * All 28 tableau cards are dealt face-up; remaining 24 form the stock.
   * @param {Object[]} deck - 52 card objects from deck.js
   */
  initGame(deck) {
    state.tableau = Array.from({ length: 7 }, () => []);
    state.foundations = Array.from({ length: 4 }, () => []);
    state.stock = [];
    state.waste = [];
    state.freeCell = null;
    state.freeCellActive = false;
    state.moveCount = 0;

    let cardIndex = 0;
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        state.tableau[col].push({ ...deck[cardIndex++], faceUp: true });
      }
    }
    state.stock = deck.slice(cardIndex).map(c => ({ ...c, faceUp: false }));
  },

  /**
   * Current state of every pile as an array of descriptors.
   * The 'stock' pile descriptor transforms into a free cell once the stock
   * is exhausted (same pile ID, different type/label/behaviour).
   * @returns {PileDescriptor[]}
   */
  getPiles() {
    const stockDescriptor = state.freeCellActive
      ? {
          id: 'stock',
          type: 'freecell',
          cards: state.freeCell ? [state.freeCell] : [],
          stackStyle: 'flat',
          faceCount: state.freeCell ? 1 : 0,
          isClickable: false,
          emptyLabel: 'FC',
        }
      : {
          id: 'stock',
          type: 'stock',
          cards: [...state.stock],
          stackStyle: 'flat',
          faceCount: 0,
          isClickable: true,
          emptyLabel: '',
          badge: state.stock.length,
        };

    return [
      stockDescriptor,
      {
        id: 'waste',
        type: 'waste',
        cards: [...state.waste],
        stackStyle: 'fan',
        faceCount: Math.min(3, state.waste.length),
        isClickable: false,
        emptyLabel: '',
      },
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
        faceCount: col.length,
        isClickable: false,
        emptyLabel: '',
      })),
    ];
  },

  /**
   * @returns {number} current move count
   */
  getMoveCount() {
    return state.moveCount;
  },

  /**
   * Returns draggable cards starting at cardIndex, or [] if not draggable.
   * For tableau columns, the sequence from cardIndex upward must form a valid
   * alternating-colour run before it can be picked up as a group.
   * @param {string} pileId
   * @param {number} cardIndex
   * @returns {Object[]}
   */
  getDraggableCards(pileId, cardIndex) {
    if (pileId === 'stock') {
      if (state.freeCellActive && state.freeCell !== null) return [state.freeCell];
      return [];
    }
    if (pileId === 'waste') {
      if (state.waste.length === 0 || cardIndex !== state.waste.length - 1) return [];
      return [state.waste[state.waste.length - 1]];
    }
    if (pileId.startsWith('f')) {
      const idx = parseInt(pileId.slice(1));
      const pile = state.foundations[idx];
      if (pile.length === 0 || cardIndex !== pile.length - 1) return [];
      return [pile[pile.length - 1]];
    }
    if (pileId.startsWith('t')) {
      const col = parseInt(pileId.slice(1));
      const cards = state.tableau[col];
      if (cardIndex < 0 || cardIndex >= cards.length) return [];
      const sequence = cards.slice(cardIndex);
      for (let i = 0; i < sequence.length - 1; i++) {
        const cur = sequence[i];
        const next = sequence[i + 1];
        if (cur.color === next.color || cur.rankValue !== next.rankValue + 1) return [];
      }
      return sequence;
    }
    return [];
  },

  /**
   * Pure move validation — does not mutate state.
   * Moving to 'stock' targets the free cell (valid only when active and empty).
   * @param {Object[]} cards
   * @param {string} fromPileId
   * @param {string} toPileId
   * @returns {boolean}
   */
  isValidMove(cards, fromPileId, toPileId) {
    if (toPileId === 'stock') {
      return state.freeCellActive && state.freeCell === null && cards.length === 1;
    }
    if (toPileId.startsWith('t')) {
      return isValidTableauMove(cards[0], parseInt(toPileId.slice(1)));
    }
    if (toPileId.startsWith('f')) {
      return cards.length === 1 && isValidFoundationMove(cards[0], state.foundations);
    }
    return false;
  },

  /**
   * Execute a validated move. Mutates state.
   * @param {Object[]} cards
   * @param {string} fromPileId
   * @param {string} toPileId
   */
  executeMove(cards, fromPileId, toPileId) {
    let from;
    if (fromPileId.startsWith('t')) {
      const col = parseInt(fromPileId.slice(1));
      from = Loc.tableau(col, state.tableau[col].indexOf(cards[0]));
    } else if (fromPileId === 'waste') {
      from = Loc.waste();
    } else if (fromPileId.startsWith('f')) {
      from = Loc.foundation(parseInt(fromPileId.slice(1)));
    } else if (fromPileId === 'stock') {
      from = Loc.freecell();
    }

    let to;
    if (toPileId.startsWith('t')) {
      to = Loc.tableau(parseInt(toPileId.slice(1)));
    } else if (toPileId.startsWith('f')) {
      to = Loc.foundation();
    } else if (toPileId === 'stock') {
      to = Loc.freecell();
    }

    moveCard(from, to);
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
   * Called when the user clicks on a pile area (not on a card).
   * Draws up to 3 cards from stock; activates free cell if stock empties.
   * @param {string} pileId
   * @returns {boolean} true if state changed
   */
  onPileClick(pileId) {
    if (pileId !== 'stock' || state.freeCellActive) return false;
    return drawFromStock();
  },

  /**
   * @returns {boolean} true if all 52 cards are on the foundations
   */
  checkWin() {
    return checkWin(state.foundations);
  },
};
