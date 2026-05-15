/**
 * Rule strings for each game variant, keyed by game id.
 * Edit the arrays here to update rules text without touching any other file.
 */
export const RULES = {
  klondike: [
    'Goal: build 4 foundation piles, one per suit, from Ace up to King.',
    'Tableau: place cards in descending rank, alternating colour (red on black, black on red).',
    'A sequence of face-up cards in order may be moved as a group.',
    'Empty tableau columns accept Kings only.',
    'Click the stock to draw one card onto the waste. Only the top waste card is playable.',
    'When the stock is empty, click ↺ to recycle all waste cards back into the stock.',
    'Moving a card automatically flips the face-down card beneath it.',
    'Double-click or double-tap a card to auto-move it to the matching foundation.',
  ],
  sawayama: [
    'Goal: build 4 foundation piles, one per suit, from Ace up to King.',
    'Tableau: descending rank, alternating colour — same as Klondike. Empty columns accept any card.',
    'Click the stock to deal up to 3 cards face-up onto the waste (shown fanned). Only the top card is playable.',
    'There is no stock recycle — each card can only be drawn once.',
    'When the stock is exhausted, the stock space becomes a free cell.',
    'Free cell: stores exactly one card, playable to any valid tableau column or foundation.',
    'Double-click or double-tap a card to auto-move it to the matching foundation.',
  ],
  yukon: [
    'Goal: build 4 foundation piles, one per suit, from Ace up to King.',
    'All 52 cards are dealt to 7 tableau columns at the start — there is no stock or waste.',
    'Tableau: place cards in descending rank, alternating colour.',
    'Any face-up card may be picked up, carrying all cards above it as a group regardless of their order.',
    'Only the bottom card of a moving group must satisfy the rank and colour rule of the destination.',
    'Empty tableau columns accept Kings only.',
    'Moving a card flips the face-down card beneath it.',
    'Double-click or double-tap a card to auto-move it to the matching foundation.',
  ],
};
