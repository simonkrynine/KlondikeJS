import { createDeck, shuffleDeck } from './deck.js';

const SUITS = ['♠', '♥', '♦', '♣'];

export const gameState = {
  tableau: [],
  foundations: [],
  stock: [],
  waste: [],
  moveCount: 0,
  undoStack: [],
  timerStarted: false,
  timerSeconds: 0,
};

/**
 * Shuffles and deals a complete new game into gameState.
 */
export const initGame = () => {
  const deck = shuffleDeck(createDeck());

  gameState.tableau = Array.from({ length: 7 }, () => []);
  gameState.foundations = Array.from({ length: 4 }, () => []);
  gameState.stock = [];
  gameState.waste = [];
  gameState.moveCount = 0;
  gameState.undoStack = [];
  gameState.timerStarted = false;
  gameState.timerSeconds = 0;

  let cardIndex = 0;
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      gameState.tableau[col].push({ ...deck[cardIndex++], faceUp: row === col });
    }
  }

  gameState.stock = deck.slice(cardIndex).map(c => ({ ...c, faceUp: false }));
};

/**
 * Returns true if moving card to targetCol is a valid tableau move.
 * @param {Object} card
 * @param {number} targetCol - Index of destination tableau column (0–6)
 * @returns {boolean}
 */
export const isValidTableauMove = (card, targetCol) => {
  const column = gameState.tableau[targetCol];
  if (column.length === 0) return card.rankValue === 13;
  const top = column[column.length - 1];
  return top.faceUp && top.rankValue === card.rankValue + 1 && top.color !== card.color;
};

/**
 * Returns true if card can be placed on its foundation pile.
 * @param {Object} card
 * @returns {boolean}
 */
export const isValidFoundationMove = (card) => {
  const foundation = gameState.foundations[SUITS.indexOf(card.suit)];
  if (foundation.length === 0) return card.rankValue === 1;
  return foundation[foundation.length - 1].rankValue === card.rankValue - 1;
};

/**
 * Executes a move, flips newly exposed cards, and saves an undo snapshot.
 * @param {{ type: 'tableau'|'waste'|'foundation', index?: number, cardIndex?: number }} from
 * @param {{ type: 'tableau'|'foundation', index?: number }} to
 */
export const moveCard = (from, to) => {
  const snapshot = JSON.parse(JSON.stringify({
    tableau: gameState.tableau,
    foundations: gameState.foundations,
    stock: gameState.stock,
    waste: gameState.waste,
    moveCount: gameState.moveCount,
  }));

  let cards;
  if (from.type === 'tableau') {
    cards = gameState.tableau[from.index].splice(from.cardIndex);
    const col = gameState.tableau[from.index];
    if (col.length > 0 && !col[col.length - 1].faceUp) {
      col[col.length - 1].faceUp = true;
    }
  } else if (from.type === 'waste') {
    cards = [gameState.waste.pop()];
  } else {
    cards = [gameState.foundations[from.index].pop()];
  }

  if (to.type === 'tableau') {
    cards.forEach(c => gameState.tableau[to.index].push(c));
  } else {
    gameState.foundations[SUITS.indexOf(cards[0].suit)].push(cards[0]);
  }

  gameState.moveCount++;
  if (gameState.undoStack.length >= 3) gameState.undoStack.shift();
  gameState.undoStack.push(snapshot);
};

/**
 * Draws the top stock card to waste, or recycles waste back to stock when empty.
 * A draw is recorded as a move; a recycle is not.
 */
export const drawFromStock = () => {
  if (gameState.stock.length === 0) {
    gameState.stock = [...gameState.waste].reverse().map(c => ({ ...c, faceUp: false }));
    gameState.waste = [];
    return;
  }

  const snapshot = JSON.parse(JSON.stringify({
    tableau: gameState.tableau,
    foundations: gameState.foundations,
    stock: gameState.stock,
    waste: gameState.waste,
    moveCount: gameState.moveCount,
  }));

  const card = gameState.stock.pop();
  card.faceUp = true;
  gameState.waste.push(card);

  gameState.moveCount++;
  if (gameState.undoStack.length >= 3) gameState.undoStack.shift();
  gameState.undoStack.push(snapshot);
};

/**
 * Reverts the most recent move. No-op if undo stack is empty.
 */
export const undoLastMove = () => {
  if (!gameState.undoStack.length) return;
  Object.assign(gameState, gameState.undoStack.pop());
};

/**
 * Returns true when all 52 cards are on the foundations.
 * @returns {boolean}
 */
export const checkWin = () => gameState.foundations.every(f => f.length === 13);
