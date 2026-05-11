const makeRank = (rank) => { const s = document.createElement('span'); s.textContent = rank; return s; };
const makeSuit = (suit) => { const s = document.createElement('span'); s.textContent = suit; return s; };

/**
 * Creates a DOM element representing a single playing card.
 * @param {Object} card - Card object with suit, rank, color, faceUp properties
 * @returns {HTMLElement}
 */
export const createCardElement = (card) => {
  const el = document.createElement('div');
  el.classList.add('card');

  if (card.faceUp) {
    el.classList.add('face-up', card.color);
    el.dataset.suit = card.suit;
    el.dataset.rank = card.rank;

    const top = document.createElement('div');
    top.classList.add('card-label', 'card-label--top');
    top.append(makeRank(card.rank));

    const suitEl = document.createElement('div');
    suitEl.classList.add('card-suit');
    suitEl.textContent = card.suit;

    const bottom = document.createElement('div');
    bottom.classList.add('card-label', 'card-label--bottom');
    bottom.append(makeRank(card.rank));

    el.append(top, suitEl, bottom);
  } else {
    el.classList.add('face-down');
  }

  return el;
};
