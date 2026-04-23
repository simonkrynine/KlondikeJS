const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/**
 * Creates a standard 52-card deck.
 * @returns {Array<Object>} Array of card objects
 */
export const createDeck = () => {
  const deck = [];
  for (const suit of SUITS) {
    for (let i = 0; i < RANKS.length; i++) {
      deck.push({
        suit,
        rank: RANKS[i],
        rankValue: i + 1,
        color: (suit === '♥' || suit === '♦') ? 'red' : 'black',
        faceUp: false,
      });
    }
  }
  return deck;
};

/**
 * Shuffles a deck in place using Fisher-Yates.
 * @param {Array<Object>} deck
 * @returns {Array<Object>} The shuffled deck
 */
export const shuffleDeck = (deck) => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};
