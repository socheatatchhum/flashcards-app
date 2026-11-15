const STORAGE_KEY = "flashcards-app-state";
const STORAGE_VERSION = 1;

function isValidCard(card) {
  return card &&
    Number.isSafeInteger(card.id) &&
    card.id > 0 &&
    typeof card.front === "string" &&
    typeof card.back === "string";
}

function isValidDeck(deck) {
  return deck &&
    Number.isSafeInteger(deck.id) &&
    deck.id > 0 &&
    typeof deck.title === "string" &&
    deck.title.trim().length > 0 &&
    Array.isArray(deck.cards) &&
    deck.cards.every(isValidCard);
}

function isValidState(state) {
  if (
    !state ||
    !Array.isArray(state.decks) ||
    !state.decks.every(isValidDeck)
  ) {
    return false;
  }

  if (state.decks.length === 0) {
    return state.activeDeckId === null;
  }

  const deckIds = state.decks.map((deck) => deck.id);
  const cardIds = state.decks.flatMap((deck) => deck.cards.map((card) => card.id));
  return new Set(deckIds).size === deckIds.length &&
    new Set(cardIds).size === cardIds.length &&
    deckIds.includes(state.activeDeckId);
}

function loadState() {
  let serialized;
  try {
    serialized = window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error("Unable to read flashcard data from local storage.", error);
    return null;
  }

  if (serialized === null) {
    return null;
  }

  let stored;
  try {
    stored = JSON.parse(serialized);
  } catch (error) {
    console.error("Flashcard data in local storage is invalid JSON.", error);
    return null;
  }

  if (
    !stored ||
    stored.version !== STORAGE_VERSION ||
    !isValidState(stored.state)
  ) {
    console.error("Flashcard data in local storage has an unsupported version or invalid shape.");
    return null;
  }

  return stored.state;
}

function saveState(state) {
  if (!isValidState(state)) {
    console.error("Refusing to save invalid flashcard state.");
    return false;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: STORAGE_VERSION,
      state
    }));
    return true;
  } catch (error) {
    console.error("Unable to save flashcard data to local storage.", error);
    return false;
  }
}
