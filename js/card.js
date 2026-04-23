/**
 * Creates a DOM element representing a single card.
 * @param {Object} card - Card object with suit, rank, color, faceUp
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
    top.textContent = `${card.rank}${card.suit}`;

    const bottom = document.createElement('div');
    bottom.classList.add('card-label', 'card-label--bottom');
    bottom.textContent = `${card.rank}${card.suit}`;

    el.append(top, bottom);
  } else {
    el.classList.add('face-down');
  }

  return el;
};
