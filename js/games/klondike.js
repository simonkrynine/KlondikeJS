const SUITS = ['♠', '♥', '♦', '♣'];

const state = {
  tableau: [],
  foundations: [],
  stock: [],
  waste: [],
  moveCount: 0,
  undoStack: [],
};

const isValidTableauMove = (card, col) => {
  const column = state.tableau[col];
  if (column.length === 0) return card.rankValue === 13;
  const top = column[column.length - 1];
  return top.faceUp && top.rankValue === card.rankValue + 1 && top.color !== card.color;
};

const isValidFoundationMove = (card) => {
  const foundation = state.foundations[SUITS.indexOf(card.suit)];
  if (foundation.length === 0) return card.rankValue === 1;
  return foundation[foundation.length - 1].rankValue === card.rankValue - 1;
};

const takeSnapshot = () => JSON.parse(JSON.stringify({
  tableau: state.tableau,
  foundations: state.foundations,
  stock: state.stock,
  waste: state.waste,
  moveCount: state.moveCount,
}));

const saveUndo = () => {
  if (state.undoStack.length >= 3) state.undoStack.shift();
  state.undoStack.push(takeSnapshot());
};

const doMoveCard = (from, to) => {
  saveUndo();
  let cards;
  if (from.type === 'tableau') {
    cards = state.tableau[from.index].splice(from.cardIndex);
    const col = state.tableau[from.index];
    if (col.length > 0 && !col[col.length - 1].faceUp) col[col.length - 1].faceUp = true;
  } else if (from.type === 'waste') {
    cards = [state.waste.pop()];
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

const doDrawFromStock = () => {
  if (state.stock.length === 0) {
    state.stock = [...state.waste].reverse().map(c => ({ ...c, faceUp: false }));
    state.waste = [];
    return;
  }
  saveUndo();
  const card = state.stock.pop();
  card.faceUp = true;
  state.waste.push(card);
  state.moveCount++;
};

const countFaceUp = (cards) => {
  let count = 0;
  for (let i = cards.length - 1; i >= 0; i--) {
    if (cards[i].faceUp) count++;
    else break;
  }
  return count;
};

/**
 * Klondike Solitaire game module implementing the standard game API.
 */
export const KlondikeGame = {

  /**
   * Initialise a new game from a freshly shuffled deck.
   * @param {Object[]} deck - 52 card objects from deck.js
   */
  initGame(deck) {
    state.tableau = Array.from({ length: 7 }, () => []);
    state.foundations = Array.from({ length: 4 }, () => []);
    state.stock = [];
    state.waste = [];
    state.moveCount = 0;
    state.undoStack = [];

    let cardIndex = 0;
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        state.tableau[col].push({ ...deck[cardIndex++], faceUp: row === col });
      }
    }
    state.stock = deck.slice(cardIndex).map(c => ({ ...c, faceUp: false }));
  },

  /**
   * Describes where piles appear in the DOM.
   * @returns {{ controlRow: string[], playArea: string[] }}
   */
  getLayout() {
    return {
      controlRow: ['stock', 'waste', 'gap', 'f0', 'f1', 'f2', 'f3'],
      playArea: ['t0', 't1', 't2', 't3', 't4', 't5', 't6'],
    };
  },

  /**
   * Static game metadata.
   * @returns {{ id: string, title: string }}
   */
  getConfig() {
    return { id: 'klondike', title: 'Klondike Solitaire' };
  },

  /**
   * Current state of every pile as an array of descriptors.
   * @returns {PileDescriptor[]}
   */
  getPiles() {
    return [
      {
        id: 'stock',
        type: 'stock',
        cards: [...state.stock],
        stackStyle: 'flat',
        faceCount: 0,
        isClickable: true,
        emptyLabel: '↺',
      },
      {
        id: 'waste',
        type: 'waste',
        cards: [...state.waste],
        stackStyle: 'flat',
        faceCount: state.waste.length > 0 ? 1 : 0,
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
        faceCount: countFaceUp(col),
        isClickable: false,
        emptyLabel: '',
      })),
    ];
  },

  /**
   * Returns draggable cards starting at cardIndex, or [] if not draggable.
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
    return [];
  },

  /**
   * Returns a foundation pile ID for auto-move, or null if none exists.
   * @param {Object[]} cards
   * @param {string} fromPileId
   * @returns {string|null}
   */
  getAutoMoveTarget(cards, fromPileId) {
    if (cards.length !== 1) return null;
    const card = cards[0];
    if (!isValidFoundationMove(card)) return null;
    return `f${SUITS.indexOf(card.suit)}`;
  },

  /**
   * Pure move validation — does not mutate state.
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
      return cards.length === 1 && isValidFoundationMove(cards[0]);
    }
    return false;
  },

  /**
   * Execute a validated move. Mutates state and saves undo snapshot.
   * @param {Object[]} cards
   * @param {string} fromPileId
   * @param {string} toPileId
   */
  executeMove(cards, fromPileId, toPileId) {
    let from;
    if (fromPileId.startsWith('t')) {
      const col = parseInt(fromPileId.slice(1));
      from = { type: 'tableau', index: col, cardIndex: state.tableau[col].indexOf(cards[0]) };
    } else if (fromPileId === 'waste') {
      from = { type: 'waste' };
    } else {
      from = { type: 'foundation', index: parseInt(fromPileId.slice(1)) };
    }

    const to = toPileId.startsWith('t')
      ? { type: 'tableau', index: parseInt(toPileId.slice(1)) }
      : { type: 'foundation' };

    doMoveCard(from, to);
  },

  /**
   * Called when the user clicks on a pile area (not on a card).
   * @param {string} pileId
   * @returns {boolean} true if state changed
   */
  onPileClick(pileId) {
    if (pileId !== 'stock') return false;
    doDrawFromStock();
    return true;
  },

  /**
   * Revert the most recent move.
   * @returns {boolean} true if there was something to undo
   */
  undoLastMove() {
    if (!state.undoStack.length) return false;
    Object.assign(state, state.undoStack.pop());
    return true;
  },

  /**
   * @returns {boolean} true if all 52 cards are on the foundations
   */
  checkWin() {
    return state.foundations.every(f => f.length === 13);
  },

  /**
   * @returns {number} current move count
   */
  getMoveCount() {
    return state.moveCount;
  },
};
