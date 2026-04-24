# Solitaire Engine Refactor — Migration Plan

## Goal

Decouple game logic from the UI so that new solitaire variants can be added by writing a single game module file, with no changes to `ui.js`, `index.html`, or any shared infrastructure.

---

## New File Structure

```
KlondikeJS/
  deck.js              ← unchanged
  card.js              ← unchanged
  gameState.js         ← deleted at end of migration (Step 7)
  ui.js                ← refactored: generic engine
  main.js              ← updated: wires a game module into the UI
  index.html           ← control row and play area become empty containers
  games/
    klondike.js        ← all current gameState.js logic + game module API
    sawayama.js        ← future variant (new file only, nothing else changes)
```

---

## The Game Module API

Every variant exports one object implementing all of the following methods.
`ui.js` depends only on this interface — it knows nothing about any specific game.

```js
export const MyGame = {

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * Initialise a new game from a freshly shuffled deck.
   * @param {Object[]} deck - 52 card objects from deck.js
   */
  initGame(deck) {},

  // ── Layout (called once on startup) ──────────────────────────────────────

  /**
   * Describes where piles appear in the DOM.
   * 'gap' is a reserved token that renders a spacer — no pile logic attached.
   * @returns {{ controlRow: string[], playArea: string[] }}
   *
   * Klondike example:
   * {
   *   controlRow: ['stock', 'waste', 'gap', 'f0', 'f1', 'f2', 'f3'],
   *   playArea:   ['t0', 't1', 't2', 't3', 't4', 't5', 't6']
   * }
   */
  getLayout() {},

  /**
   * Static game metadata.
   * @returns {{ id: string, title: string }}
   *
   * Example: { id: 'klondike', title: 'Klondike Solitaire' }
   */
  getConfig() {},

  // ── State (called on every render) ───────────────────────────────────────

  /**
   * Current state of every pile as an array of descriptors.
   * ui.js renders entirely from this — see Pile Descriptor section below.
   * @returns {PileDescriptor[]}
   */
  getPiles() {},

  // ── Interaction ───────────────────────────────────────────────────────────

  /**
   * Returns the cards that would be picked up if the user drags from
   * the given position. Returns [] if the card is not draggable.
   * @param {string} pileId
   * @param {number} cardIndex - index into the pile's cards array
   * @returns {Object[]} cards
   */
  getDraggableCards(pileId, cardIndex) {},

  /**
   * Pure validation — does NOT mutate state.
   * @param {Object[]} cards
   * @param {string}   fromPileId
   * @param {string}   toPileId
   * @returns {boolean}
   */
  isValidMove(cards, fromPileId, toPileId) {},

  /**
   * Execute a validated move. Mutates state, flips newly exposed cards,
   * and pushes an undo snapshot.
   * Precondition: isValidMove returned true for the same arguments.
   * @param {Object[]} cards
   * @param {string}   fromPileId
   * @param {string}   toPileId
   */
  executeMove(cards, fromPileId, toPileId) {},

  /**
   * Returns a target pile ID for a double-click auto-move, or null if
   * no valid auto-move exists from the given position.
   * @param {Object[]} cards
   * @param {string}   fromPileId
   * @returns {string|null} toPileId
   */
  getAutoMoveTarget(cards, fromPileId) {},

  /**
   * Called when the user clicks on a pile area (not on a card).
   * Used for stock draws, reserve interactions, etc.
   * @param {string} pileId
   * @returns {boolean} true if state changed (triggers re-render)
   */
  onPileClick(pileId) {},

  // ── Generic ───────────────────────────────────────────────────────────────

  /**
   * Revert the most recent move.
   * @returns {boolean} true if there was something to undo
   */
  undoLastMove() {},

  /**
   * @returns {boolean} true if the win condition is met
   */
  checkWin() {},
};
```

---

## The Pile Descriptor

`getPiles()` returns one `PileDescriptor` per pile. This is the universal data
model `ui.js` renders from. It never branches on `type` — that field exists
only for CSS class assignment.

```js
// PileDescriptor shape
{
  id:          'f0',         // unique string; used as DOM id suffix and in all move calls
  type:        'foundation', // for CSS class only: pile-container--foundation
  cards:       [...],        // Object[] — index 0 is bottom of pile, last is top
  stackStyle:  'flat',       // 'stacked' — overlapping vertical fan (tableau columns)
                             // 'flat'    — only top card visible (stock, waste, foundation)
  faceCount:   1,            // number of cards from the top that are face-up
  isClickable: false,        // if true, an empty-area click calls onPileClick(id)
  emptyLabel:  'A',          // text shown in the placeholder when cards is empty
}

// NOTE — faceUp on card objects vs faceCount on the descriptor:
// Card objects in the game module still carry a faceUp property (they do today).
// faceCount is used by renderPile to compute isFaceUp per card:
//   const isFaceUp = index >= (cards.length - faceCount);
// renderPile then calls:
//   createCardElement({ ...card, faceUp: isFaceUp })
// This means card.js receives the correct faceUp value without needing changes.
// For Klondike and Sawayama, faceCount === number of face-up cards at the top
// of the pile, which is always a contiguous run. If a future variant needs
// non-contiguous face-up cards, add a faceUpIndices: number[] field to the
// descriptor and have renderPile check it as a fallback.
```

### Klondike `getPiles()` example (fresh deal)

```js
[
  { id: 'stock', type: 'stock',      cards: [...24], stackStyle: 'flat',    faceCount: 0, isClickable: true,  emptyLabel: '↺' },
  { id: 'waste', type: 'waste',      cards: [],      stackStyle: 'flat',    faceCount: 1, isClickable: false, emptyLabel: ''  },
  { id: 'f0',    type: 'foundation', cards: [],      stackStyle: 'flat',    faceCount: 1, isClickable: false, emptyLabel: 'A' },
  { id: 'f1',    type: 'foundation', cards: [],      stackStyle: 'flat',    faceCount: 1, isClickable: false, emptyLabel: 'A' },
  { id: 'f2',    type: 'foundation', cards: [],      stackStyle: 'flat',    faceCount: 1, isClickable: false, emptyLabel: 'A' },
  { id: 'f3',    type: 'foundation', cards: [],      stackStyle: 'flat',    faceCount: 1, isClickable: false, emptyLabel: 'A' },
  { id: 't0',    type: 'tableau',    cards: [...1],  stackStyle: 'stacked', faceCount: 1, isClickable: false, emptyLabel: ''  },
  { id: 't1',    type: 'tableau',    cards: [...2],  stackStyle: 'stacked', faceCount: 1, isClickable: false, emptyLabel: ''  },
  { id: 't2',    type: 'tableau',    cards: [...3],  stackStyle: 'stacked', faceCount: 1, isClickable: false, emptyLabel: ''  },
  { id: 't3',    type: 'tableau',    cards: [...4],  stackStyle: 'stacked', faceCount: 1, isClickable: false, emptyLabel: ''  },
  { id: 't4',    type: 'tableau',    cards: [...5],  stackStyle: 'stacked', faceCount: 1, isClickable: false, emptyLabel: ''  },
  { id: 't5',    type: 'tableau',    cards: [...6],  stackStyle: 'stacked', faceCount: 1, isClickable: false, emptyLabel: ''  },
  { id: 't6',    type: 'tableau',    cards: [...7],  stackStyle: 'stacked', faceCount: 1, isClickable: false, emptyLabel: ''  },
]
```

---

## How `ui.js` Changes

### Dependency injection

`ui.js` exports `initUI(game)` instead of importing `gameState.js` directly.
`main.js` passes in the chosen game module at startup.

```js
// ui.js
let game;

export function initUI(gameModule) {
  game = gameModule;
  buildLayout();
  setupListeners();
  renderGame();
  updateStats();
}
```

```js
// main.js
import { createDeck, shuffleDeck } from './deck.js';
import { initUI }                  from './ui.js';
import { KlondikeGame }            from './games/klondike.js';

const deck = shuffleDeck(createDeck());
KlondikeGame.initGame(deck);
initUI(KlondikeGame);
```

### Layout construction

`buildLayout()` reads `game.getLayout()` and creates pile container elements
dynamically. `index.html` only needs two empty containers.

```js
function buildLayout() {
  const { controlRow, playArea } = game.getLayout();
  const { id, title } = game.getConfig();

  document.title = title;
  document.querySelector('h1').textContent = title;

  buildRow(document.getElementById('control-row'), controlRow);
  buildRow(document.getElementById('play-area'),   playArea);
}

function buildRow(rowEl, pileIds) {
  rowEl.innerHTML = '';
  for (const pileId of pileIds) {
    if (pileId === 'gap') {
      const gap = document.createElement('div');
      gap.className = 'gap';
      rowEl.appendChild(gap);
    } else {
      const div = document.createElement('div');
      div.id = `pile-${pileId}`;
      div.className = 'pile-container';
      div.dataset.pileId = pileId;
      rowEl.appendChild(div);
    }
  }
}
```

### One generic render function

The four Klondike-specific render functions (`renderStock`, `renderWaste`,
`renderFoundations`, `renderTableau`) are replaced by a single generic pair:

```js
function renderGame() {
  for (const pile of game.getPiles()) renderPile(pile);
}

function renderPile({ id, type, cards, stackStyle, faceCount, isClickable, emptyLabel }) {
  const container = document.getElementById(`pile-${id}`);
  container.innerHTML = '';
  container.className = `pile-container pile-container--${type}`;

  if (cards.length === 0) {
    const el = document.createElement('div');
    el.className = 'pile-empty';
    el.textContent = emptyLabel;
    if (isClickable) el.dataset.pileId = id;
    container.appendChild(el);
    return;
  }

  const faceUpStart = cards.length - faceCount;
  const cardH       = getCssVar('--card-h');
  const faceUpOff   = Math.round(cardH * 0.25);
  const faceDownOff = Math.round(cardH * 0.179);
  let top = 0;

  cards.forEach((card, index) => {
    const isFaceUp = index >= faceUpStart;
    const cardEl   = createCardElement({ ...card, faceUp: isFaceUp });
    cardEl.style.top = stackStyle === 'stacked' ? `${top}px` : '0';

    if (isFaceUp) {
      cardEl.draggable   = true;
      cardEl.dataset.pileId    = id;
      cardEl.dataset.cardIndex = index;
    }
    container.appendChild(cardEl);

    if (stackStyle === 'stacked') top += isFaceUp ? faceUpOff : faceDownOff;
  });

  if (stackStyle === 'stacked' && cards.length > 0) {
    const last      = cards[cards.length - 1];
    const lastIsFaceUp = (cards.length - 1) >= faceUpStart;
    const lastOff   = lastIsFaceUp ? faceUpOff : faceDownOff;
    container.style.height = `${(top - lastOff) + cardH}px`;
  }
}
```

### Simplified dataset attributes

Card elements carry two generic attributes instead of the four Klondike-specific ones:

| Before | After |
|---|---|
| `data-from-type="tableau"` | `data-pile-id="t0"` |
| `data-from-col="0"` | `data-card-index="3"` |
| `data-from-card-index="3"` | *(removed)* |
| `data-from-index="0"` | *(removed)* |

### Generic interaction handlers

```js
// Drag start
function onDragStart(e) {
  const cardEl = e.target.closest('[data-pile-id]');
  if (!cardEl) return;

  const pileId    = cardEl.dataset.pileId;
  const cardIndex = parseInt(cardEl.dataset.cardIndex, 10);
  const cards     = game.getDraggableCards(pileId, cardIndex);
  if (cards.length === 0) { e.preventDefault(); return; }

  activeDrag = { cards, fromPileId: pileId };
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', '');
}

// Drop
function onDrop(e) {
  e.preventDefault();
  const targetEl = e.target.closest('[data-pile-id]');
  if (!targetEl || !activeDrag) return;

  const toPileId = targetEl.dataset.pileId;
  if (game.isValidMove(activeDrag.cards, activeDrag.fromPileId, toPileId)) {
    game.executeMove(activeDrag.cards, activeDrag.fromPileId, toPileId);
    afterMove();
  }
  activeDrag = null;
}

// Double-click auto-move
function onDblClick(e) {
  const cardEl = e.target.closest('[data-pile-id]');
  if (!cardEl) return;

  const pileId = cardEl.dataset.pileId;
  const cards  = game.getDraggableCards(pileId, parseInt(cardEl.dataset.cardIndex, 10));
  if (cards.length === 0) return;

  const target = game.getAutoMoveTarget(cards, pileId);
  if (target && game.isValidMove(cards, pileId, target)) {
    game.executeMove(cards, pileId, target);
    afterMove();
  }
}

// Pile click (stock draw, free cell, etc.)
function onPileClick(e) {
  if (e.detail >= 2) return;
  const pileEl = e.target.closest('[data-pile-id]');
  if (!pileEl) return;

  const changed = game.onPileClick(pileEl.dataset.pileId);
  if (changed) afterMove();
}
```

### What `ui.js` retains unchanged

- Timer start / stop / display
- Stats display (`updateStats`)
- Win overlay and confetti
- Undo button → `game.undoLastMove()` then `renderGame()`
- New game button → `game.initGame(newDeck)` then `buildLayout()` + `renderGame()`
- Keyboard shortcuts (Escape, Ctrl+Z)

---

## How `index.html` Changes

The hardcoded pile elements are replaced by two empty containers.
Everything else (header, stats, buttons, win overlay) stays the same.

**Before:**
```html
<div class="control-row">
  <div id="stock" class="pile"></div>
  <div id="waste" class="pile"></div>
  <div class="gap"></div>
  <div id="foundation-0" class="pile foundation"></div>
  <div id="foundation-1" class="pile foundation"></div>
  <div id="foundation-2" class="pile foundation"></div>
  <div id="foundation-3" class="pile foundation"></div>
</div>
<div class="tableau-row">
  <div id="tableau-0" class="tableau-col"></div>
  <!-- ... 6 more -->
</div>
```

**After:**
```html
<div id="control-row" class="control-row"></div>
<div id="play-area"   class="tableau-row"></div>
```

---

## CSS Impact

Element IDs and class names change to match the generic scheme.
No structural styles change — only selector names.

| Before | After |
|---|---|
| `#stock` | `#pile-stock` |
| `#waste` | `#pile-waste` |
| `#foundation-0` | `#pile-f0` |
| `#tableau-0` | `#pile-t0` |
| `.tableau-col` | `.pile-container--tableau` |
| `.foundation` | `.pile-container--foundation` |
| `.pile` | `.pile-container` |

---

## Migration Steps

Each step is independently testable. Klondike remains playable after every
step except Step 5, which breaks it briefly until Step 6 restores it.
Complete Steps 5 and 6 in the same session.

---

### Step 1 — Create `games/klondike.js`

Create `games/klondike.js`. Copy `gameState.js` into it verbatim, then add the
`KlondikeGame` export object at the bottom. Implement `getPiles()` first — it
assembles `PileDescriptor[]` from the existing internal arrays — and verify it
in the browser console.

`gameState.js` and `ui.js` are untouched. Klondike still works via the old path.

**Verify:** `KlondikeGame.getPiles()` returns the correct pile descriptors for a
fresh deal when called from the console.

---

### Step 2 — Add read-only API methods to `games/klondike.js`

Implement `getLayout()`, `getConfig()`, `getDraggableCards()`, and
`getAutoMoveTarget()`. These are all pure / read-only and do not touch the DOM,
so they are easy to verify in the console without UI changes.

**Verify:** Call each method from the console and confirm correct return values.

---

### Step 3 — Add mutating API methods to `games/klondike.js`

Implement `isValidMove()`, `executeMove()`, `onPileClick()`, `undoLastMove()`,
and `checkWin()`. All delegate to the logic already in the file.

At the end of this step `games/klondike.js` fully satisfies the API contract.

**Verify:** Call `executeMove` from the console, then `getPiles()`, and confirm
state changed correctly.

---

### Step 4 — Update `main.js`

Import `KlondikeGame` from `games/klondike.js`. Call `KlondikeGame.initGame(deck)`
before calling the existing `ui.js` bootstrap. `ui.js` still uses `gameState.js`
directly — this step only confirms the game module initialises without errors.

**Verify:** Page loads and game plays normally.

---

### Step 5 — Strip hardcoded HTML from `index.html`

Replace the hardcoded pile elements with:

```html
<div id="control-row" class="control-row"></div>
<div id="play-area"   class="tableau-row"></div>
```

The page will be broken after this step until Step 6 is done.

---

### Step 6 — Refactor `ui.js` to the generic engine

Do this in sub-steps within a single editing session:

1. Add `let game;` and `export function initUI(gameModule)`.
   Update `main.js` to call `initUI(KlondikeGame)`.
2. Implement `buildLayout()` using `game.getLayout()`.
   Verify pile containers appear in the DOM.
3. Replace the four specific render functions with `renderGame()` +
   `renderPile()`. Verify cards render correctly.
4. Update drag/drop handlers to use `data-pile-id` + `data-card-index`,
   calling `game.getDraggableCards`, `game.isValidMove`, `game.executeMove`.
5. Update click handler to call `game.onPileClick`.
   Update double-click to call `game.getAutoMoveTarget`.
6. Update undo button to call `game.undoLastMove()`.
7. Update CSS selectors to match the new `#pile-*` and
   `pile-container--*` naming scheme.

**Verify:** Klondike is fully playable. Play to a win. Test undo, new game,
auto-move, and the timer.

---

### Step 7 — Delete `gameState.js`

Remove `gameState.js` and any remaining imports of it. Confirm nothing breaks.

**Verify:** Page loads, full game plays normally.

---

### Step 8 — Smoke test and cleanup

- Play a complete game through to the win screen.
- Test: undo (up to 3 moves), new game, double-click auto-move, draw from
  stock (including empty-stock recycle), responsive layout at < 800px.
- Remove any dead code remaining in `ui.js`.
- Confirm `gameState.js` is gone and no file references it.

---

## Adding a New Variant After the Refactor

1. Create `games/sawayama.js` implementing the game module API.
2. In `main.js`, swap the import:
   ```js
   import { SawayamaGame } from './games/sawayama.js';
   SawayamaGame.initGame(deck);
   initUI(SawayamaGame);
   ```
3. No other files change.

For a variant selector (letting the user pick on the same page), `main.js` can
import both modules and pass the chosen one to `initUI`. The UI does not change.

---

## Data-Flow Summary

```
main.js
  shuffleDeck(createDeck())  →  deck
  game.initGame(deck)
  initUI(game)
    └─ ui.js
         buildLayout()
           ├─ game.getLayout()   →  pile ID lists  →  DOM containers
           └─ game.getConfig()   →  title
         renderGame()
           └─ game.getPiles()    →  PileDescriptor[]  →  DOM cards
         event handlers
           ├─ game.getDraggableCards()
           ├─ game.isValidMove()
           ├─ game.executeMove()
           ├─ game.onPileClick()
           ├─ game.getAutoMoveTarget()
           ├─ game.undoLastMove()
           └─ game.checkWin()
           └─ renderGame()       →  re-render after every state change
```
