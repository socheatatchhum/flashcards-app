const defaultDecks = [
  {
    id: 1,
    title: "Getting started",
    cards: [
      { front: "What is a flashcard?", back: "A prompt paired with an answer to help you practice recall." },
      { front: "What is active recall?", back: "Remembering information from memory instead of rereading it." },
      { front: "How often should you review?", back: "Short, regular sessions help reinforce what you learn." }
    ]
  },
  {
    id: 2,
    title: "Vocabulary",
    cards: [
      { front: "What does 'curious' mean?", back: "Eager to know or learn something." },
      { front: "What does 'concise' mean?", back: "Giving a lot of information clearly in few words." }
    ]
  },
  {
    id: 3,
    title: "Science",
    cards: [
      { front: "What is the smallest unit of an element?", back: "An atom." },
      { front: "What force keeps planets in orbit?", back: "Gravity." }
    ]
  }
];

const savedState = loadState();
const decks = savedState ? savedState.decks : defaultDecks;
const deckList = document.querySelector("#deck-list");
const deckTitle = document.querySelector("#deck-title");
const cardCount = document.querySelector("#card-count");
const cardSearch = document.querySelector("#card-search");
const flashcard = document.querySelector("#flashcard");
const flashcardFront = document.querySelector("#flashcard-front");
const flashcardBack = document.querySelector("#flashcard-back");
const frontContent = document.querySelector("#front-content");
const backContent = document.querySelector("#back-content");
const studyStatus = document.querySelector("#study-status");
const previousButton = document.querySelector("#previous-card");
const nextButton = document.querySelector("#next-card");
const flipButton = document.querySelector("#flip-card");
const shuffleButton = document.querySelector("#shuffle-cards");
const newDeckButton = document.querySelector("#new-deck");
const newCardButton = document.querySelector("#new-card");
const startStudyButton = document.querySelector("#enter-study");
const studyControls = document.querySelector("#study-controls");
const exitStudyButton = document.querySelector("#exit-study");
const cardList = document.querySelector("#card-list");
const cardLibrary = document.querySelector("#card-library");
const libraryCount = document.querySelector("#library-count");
const entryDialog = document.querySelector("#entry-dialog");
const entryForm = document.querySelector("#entry-form");
const entryTitle = document.querySelector("#entry-title");
const entryError = document.querySelector("#entry-error");
const firstFieldLabel = document.querySelector("#first-field-caption");
const secondFieldLabel = document.querySelector("#second-field-label");
const secondFieldCaption = document.querySelector("#second-field-caption");
const firstField = document.querySelector("#entry-first");
const secondField = document.querySelector("#entry-second");

let activeDeckId = savedState ? savedState.activeDeckId : decks[0]?.id ?? null;
let currentCardIndex = 0;
let isFlipped = false;
let studyModeActive = false;
let studyCards = [];
let searchTimeoutId = null;
let entryMode = "deck";
let editingCardId = null;
let nextCardId = 1;

decks.forEach((deck) => {
  deck.cards.forEach((card) => {
    if (!Number.isSafeInteger(card.id) || card.id < 1) {
      card.id = nextCardId;
    }
    nextCardId = Math.max(nextCardId, card.id + 1);
  });
});
let nextDeckId = decks.reduce((nextId, deck) => Math.max(nextId, deck.id + 1), 1);

function persistState() {
  return saveState({ decks, activeDeckId });
}

function cancelPendingSearch() {
  if (searchTimeoutId !== null) {
    window.clearTimeout(searchTimeoutId);
    searchTimeoutId = null;
  }
}

function clearCardSearch() {
  cancelPendingSearch();
  cardSearch.value = "";
}

function getActiveDeck() {
  return decks.find((deck) => deck.id === activeDeckId);
}

function getVisibleCards() {
  const activeDeck = getActiveDeck();
  if (!activeDeck) {
    return [];
  }

  const query = cardSearch.value.trim().toLocaleLowerCase();
  return activeDeck.cards.filter((card) =>
    `${card.front} ${card.back}`.toLocaleLowerCase().includes(query)
  );
}

function createEmptyState(iconType, title, instruction) {
  const emptyState = document.createElement("div");
  emptyState.className = "empty-state-component";
  emptyState.setAttribute("role", "status");

  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.classList.add("empty-state-icon");
  icon.setAttribute("viewBox", "0 0 48 48");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("focusable", "false");

  const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
  shape.setAttribute(
    "d",
    iconType === "decks"
      ? "M8 13 24 6l16 7v21l-16 7-16-7V13Zm0 0 16 7 16-7M24 20v21"
      : "M11 10h25a3 3 0 0 1 3 3v24H14a3 3 0 0 1-3-3V10Zm6 8h15m-15 7h15m-15 7h9"
  );
  shape.setAttribute("fill", "none");
  shape.setAttribute("stroke", "currentColor");
  shape.setAttribute("stroke-width", "2.5");
  shape.setAttribute("stroke-linecap", "round");
  shape.setAttribute("stroke-linejoin", "round");
  icon.append(shape);

  const heading = document.createElement("h3");
  heading.textContent = title;
  const description = document.createElement("p");
  description.textContent = instruction;

  emptyState.append(icon, heading, description);
  return emptyState;
}

function renderDecks() {
  deckList.replaceChildren();

  if (decks.length === 0) {
    const item = document.createElement("li");
    item.append(createEmptyState("decks", "No decks yet", "Select New Deck to create your first deck."));
    deckList.append(item);
    return;
  }

  decks.forEach((deck) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.className = "deck-button";
    button.type = "button";
    button.dataset.deckId = String(deck.id);
    button.textContent = deck.title;

    deck.id === activeDeckId
      ? button.setAttribute("aria-current", "page")
      : button.removeAttribute("aria-current");

    item.append(button);
    deckList.append(item);
  });
}

function renderCard() {
  const activeDeck = getActiveDeck();
  const cards = studyModeActive ? studyCards : getVisibleCards();
  const hasCards = cards.length > 0;
  const activeCard = hasCards ? cards[currentCardIndex] : null;

  deckTitle.textContent = activeDeck ? activeDeck.title : "No decks yet";
  if (hasCards) {
    cardCount.textContent = `Card ${currentCardIndex + 1} of ${cards.length}`;
  } else if (!activeDeck) {
    cardCount.textContent = "No decks yet";
  } else if (activeDeck.cards.length === 0) {
    cardCount.textContent = "No cards yet";
  } else {
    cardCount.textContent = "No cards found";
  }

  flashcard.classList.toggle("is-flipped", isFlipped);
  flipButton.setAttribute("aria-pressed", String(isFlipped));
  flipButton.disabled = !hasCards;
  previousButton.disabled = !hasCards || currentCardIndex === 0;
  nextButton.disabled = !hasCards || currentCardIndex >= cards.length - 1;
  shuffleButton.disabled = !studyModeActive || cards.length < 2;
  flashcardFront.setAttribute("aria-hidden", String(isFlipped));
  flashcardBack.setAttribute("aria-hidden", String(!isFlipped));
  frontContent.textContent = activeCard
    ? activeCard.front
    : !activeDeck
      ? "Create a deck to get started."
      : activeDeck.cards.length === 0
        ? "Add a card to get started."
        : "No cards found. Try a different search.";
  backContent.textContent = activeCard
    ? activeCard.back
    : !activeDeck
      ? "Create a deck to get started."
      : activeDeck.cards.length === 0
        ? "Add a card to get started."
        : "No cards found. Try a different search.";
  frontContent.classList.toggle("empty-state", !activeCard);
  backContent.classList.toggle("empty-state", !activeCard);
}

function renderCardList() {
  const activeDeck = getActiveDeck();
  const cards = getVisibleCards();
  cardList.replaceChildren();
  const isSearching = cardSearch.value.trim().length > 0;
  libraryCount.textContent = isSearching
    ? `${cards.length} ${cards.length === 1 ? "match" : "matches"}`
    : `${cards.length} ${cards.length === 1 ? "card" : "cards"}`;

  if (cards.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "card-list-empty-item";
    const isEmptyDeck = activeDeck && activeDeck.cards.length === 0;
    const hasNoDeck = !activeDeck;
    const title = hasNoDeck
      ? "No decks yet"
      : isEmptyDeck
        ? "No cards yet"
        : "No cards found";
    const instruction = hasNoDeck
      ? "Select New Deck to create a deck, then add cards."
      : isEmptyDeck
        ? "Select New Card to add the first card to this deck."
        : "Try another search, or clear the search field to see every card.";
    emptyItem.append(createEmptyState(hasNoDeck ? "decks" : "cards", title, instruction));
    cardList.append(emptyItem);
    return;
  }

  cards.forEach((card, index) => {
    const item = document.createElement("li");
    item.className = "card-list-item";

    const preview = document.createElement("button");
    preview.className = "card-preview";
    preview.type = "button";
    preview.dataset.action = "study";
    preview.dataset.cardId = String(card.id);
    preview.setAttribute("aria-current", index === currentCardIndex ? "true" : "false");
    preview.textContent = card.front;

    const actions = document.createElement("div");
    actions.className = "card-item-actions";

    const editButton = document.createElement("button");
    editButton.className = "button button-secondary";
    editButton.type = "button";
    editButton.dataset.action = "edit";
    editButton.dataset.cardId = String(card.id);
    editButton.textContent = "Edit";
    editButton.setAttribute("aria-label", `Edit card: ${card.front}`);

    const deleteButton = document.createElement("button");
    deleteButton.className = "button button-danger";
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.cardId = String(card.id);
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete card: ${card.front}`);

    actions.append(editButton, deleteButton);
    item.append(preview, actions);
    cardList.append(item);
  });
}

function renderStudy() {
  renderCard();
  renderCardList();
  startStudyButton.hidden = studyModeActive;
  studyControls.hidden = !studyModeActive;
  cardLibrary.hidden = studyModeActive || !getActiveDeck();
  cardSearch.disabled = studyModeActive;
  newCardButton.disabled = studyModeActive || !getActiveDeck();
  newDeckButton.disabled = studyModeActive;
  startStudyButton.disabled = studyModeActive || !getActiveDeck() || getVisibleCards().length === 0;
}

function render() {
  renderDecks();
  renderStudy();
}

function enterStudyMode(deckId, startCardId = null) {
  const deck = decks.find((item) => String(item.id) === String(deckId));
  if (!deck) {
    throw new RangeError(`Cannot start study mode: deck "${deckId}" was not found.`);
  }

  if (studyModeActive) {
    exitStudyMode(false);
  }

  const activeDeckChanged = activeDeckId !== deck.id;
  if (activeDeckChanged) {
    clearCardSearch();
  }
  activeDeckId = deck.id;
  if (activeDeckChanged) {
    persistState();
  }
  cancelPendingSearch();
  studyCards = getVisibleCards();
  const requestedIndex = startCardId === null
    ? 0
    : studyCards.findIndex((card) => String(card.id) === String(startCardId));
  currentCardIndex = requestedIndex < 0 ? 0 : requestedIndex;
  isFlipped = false;
  studyModeActive = true;
  studyStatus.textContent = "Study mode started";
  document.addEventListener("keydown", handleStudyKeydown);
  render();
  (studyCards.length > 0 ? flipButton : exitStudyButton).focus();
}

function exitStudyMode(restoreFocus = true) {
  if (!studyModeActive) {
    return;
  }

  document.removeEventListener("keydown", handleStudyKeydown);
  studyModeActive = false;
  studyCards = [];
  currentCardIndex = 0;
  isFlipped = false;
  studyStatus.textContent = "Study mode ended";
  renderStudy();
  if (restoreFocus) {
    startStudyButton.focus();
  }
}

function handleStudyKeydown(event) {
  if (!studyModeActive || entryDialog.open || event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }

  const target = event.target;
  if (target instanceof Element && target.closest("input, textarea, select, [contenteditable='true']")) {
    return;
  }
  if (
    (event.code === "Space" || event.key === " ") &&
    target instanceof Element &&
    target.closest("button, a")
  ) {
    return;
  }

  if (event.code === "Space" || event.key === " ") {
    event.preventDefault();
    flipCurrentCard();
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    showPreviousCard();
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    showNextCard();
  }
}

function flipCurrentCard() {
  if (studyModeActive && studyCards.length > 0) {
    isFlipped = !isFlipped;
    renderStudy();
  }
}

function showPreviousCard() {
  if (studyModeActive && currentCardIndex > 0) {
    currentCardIndex -= 1;
    isFlipped = false;
    renderStudy();
  }
}

function showNextCard() {
  if (studyModeActive && currentCardIndex < studyCards.length - 1) {
    currentCardIndex += 1;
    isFlipped = false;
    renderStudy();
  }
}

function shuffleStudyCards() {
  if (!studyModeActive) {
    return;
  }

  for (let index = studyCards.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [studyCards[index], studyCards[randomIndex]] = [studyCards[randomIndex], studyCards[index]];
  }
  currentCardIndex = 0;
  isFlipped = false;
  renderStudy();
}

deckList.addEventListener("click", (event) => {
  const deckButton = event.target.closest("button[data-deck-id]");
  if (!deckButton || !deckList.contains(deckButton)) {
    return;
  }

  const deck = decks.find((item) => String(item.id) === deckButton.dataset.deckId);
  if (!deck) {
    return;
  }

  if (studyModeActive) {
    exitStudyMode(false);
  }
  activeDeckId = deck.id;
  currentCardIndex = 0;
  isFlipped = false;
  clearCardSearch();
  persistState();
  render();
  deckList.querySelector("button[aria-current='page']")?.focus();
});

cardList.addEventListener("click", (event) => {
  const actionButton = event.target.closest("button[data-action]");
  if (!actionButton || !cardList.contains(actionButton)) {
    return;
  }

  const cardId = Number(actionButton.dataset.cardId);
  const activeDeck = getActiveDeck();
  const card = activeDeck.cards.find((item) => item.id === cardId);
  if (!card) {
    return;
  }

  if (actionButton.dataset.action === "study") {
    enterStudyMode(activeDeckId, cardId);
  } else if (actionButton.dataset.action === "edit") {
    openEntryDialog("edit", card);
  } else if (actionButton.dataset.action === "delete") {
    const visibleCards = getVisibleCards();
    const deletedIndex = visibleCards.findIndex((item) => item.id === cardId);
    activeDeck.cards = activeDeck.cards.filter((item) => item.id !== cardId);
    persistState();
    if (deletedIndex < currentCardIndex) {
      currentCardIndex -= 1;
    } else if (deletedIndex === currentCardIndex) {
      currentCardIndex = Math.min(currentCardIndex, Math.max(0, visibleCards.length - 2));
    }
    isFlipped = false;
    renderStudy();
    const remainingCards = getVisibleCards();
    const focusCard = remainingCards[Math.min(deletedIndex, remainingCards.length - 1)];
    const focusTarget = focusCard
      ? cardList.querySelector(`[data-action="study"][data-card-id="${focusCard.id}"]`)
      : newCardButton;
    focusTarget.focus();
  }
});

startStudyButton.addEventListener("click", () => enterStudyMode(activeDeckId));
exitStudyButton.addEventListener("click", exitStudyMode);
previousButton.addEventListener("click", showPreviousCard);
nextButton.addEventListener("click", showNextCard);
flipButton.addEventListener("click", flipCurrentCard);
shuffleButton.addEventListener("click", shuffleStudyCards);

cardSearch.addEventListener("input", () => {
  cancelPendingSearch();
  searchTimeoutId = window.setTimeout(() => {
    searchTimeoutId = null;
    if (studyModeActive) {
      return;
    }
    currentCardIndex = 0;
    isFlipped = false;
    renderStudy();
  }, 300);
});

function openEntryDialog(mode, card = null) {
  clearEntryError();
  entryMode = mode;
  const isDeckEntry = mode === "deck";
  editingCardId = mode === "edit" && card ? card.id : null;
  entryTitle.textContent = isDeckEntry
    ? "Create a deck"
    : editingCardId === null
      ? "Create a card"
      : "Edit card";
  firstFieldLabel.textContent = isDeckEntry ? "Deck name" : "Front";
  secondFieldCaption.textContent = "Back";
  secondFieldLabel.hidden = isDeckEntry;
  firstField.value = card ? card.front : "";
  secondField.value = card ? card.back : "";
  secondField.required = !isDeckEntry;
  entryDialog.showModal();
  firstField.focus();
}

function clearEntryError() {
  entryError.hidden = true;
  entryError.textContent = "";
  [firstField, secondField].forEach((field) => {
    field.removeAttribute("aria-invalid");
    field.removeAttribute("aria-describedby");
  });
}

function showEntryError(message, field) {
  entryError.textContent = message;
  entryError.hidden = false;
  field.setAttribute("aria-invalid", "true");
  field.setAttribute("aria-describedby", "entry-error");
  field.focus();
}

newDeckButton.addEventListener("click", () => openEntryDialog("deck"));
newCardButton.addEventListener("click", () => openEntryDialog("card"));
document.querySelector("#close-entry").addEventListener("click", () => entryDialog.close());
document.querySelector("#cancel-entry").addEventListener("click", () => entryDialog.close());

entryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const firstValue = firstField.value.trim();
  const secondValue = secondField.value.trim();

  if (!firstValue) {
    showEntryError(
      entryMode === "deck" ? "Deck name cannot be empty." : "Front cannot be empty.",
      firstField
    );
    return;
  }
  if (entryMode !== "deck" && !secondValue) {
    showEntryError("Back cannot be empty.", secondField);
    return;
  }

  const editedCardId = entryMode === "edit" ? editingCardId : null;
  clearEntryError();
  isFlipped = false;

  if (entryMode === "deck") {
    const deck = {
      id: nextDeckId,
      title: firstValue,
      cards: []
    };
    nextDeckId += 1;
    decks.push(deck);
    activeDeckId = deck.id;
    currentCardIndex = 0;
    clearCardSearch();
    persistState();
    render();
  } else if (editingCardId !== null) {
    const activeDeck = getActiveDeck();
    const editedCard = activeDeck.cards.find((card) => card.id === editingCardId);
    if (!editedCard) {
      return;
    }
    editedCard.front = firstValue;
    editedCard.back = secondValue;
    clearCardSearch();
    currentCardIndex = activeDeck.cards.findIndex((card) => card.id === editingCardId);
    persistState();
    renderStudy();
  } else {
    const activeDeck = getActiveDeck();
    activeDeck.cards.push({
      id: nextCardId,
      front: firstValue,
      back: secondValue
    });
    nextCardId += 1;
    clearCardSearch();
    currentCardIndex = activeDeck.cards.length - 1;
    persistState();
    renderStudy();
  }

  entryDialog.close();
  if (editedCardId !== null) {
    cardList.querySelector(`[data-action="edit"][data-card-id="${editedCardId}"]`)?.focus();
  }
});

entryForm.addEventListener("input", clearEntryError);

render();