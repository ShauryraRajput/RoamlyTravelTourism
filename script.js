'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const destinationGrid = $('#destination-grid');
const destinationCards = $$('.destination-card');
const filterButtons = $$('.filter-chip');
const searchForm = $('#trip-search');
const searchDestination = $('#search-destination');
const searchVibe = $('#search-vibe');
const resultsLabel = $('#results-label');
const emptyState = $('#empty-state');
const bookingDialog = $('#booking-dialog');
const savedDialog = $('#saved-dialog');
const bookingForm = $('#booking-form');
const bookingTrip = $('#booking-trip');
const bookingDate = $('#booking-date');
const bookingFeedback = $('#booking-feedback');
const toast = $('#toast');
const savedList = $('#saved-list');
const savedEmpty = $('#saved-empty');
const savedCount = $('#saved-count');

let activeCategory = 'all';
let searchTerm = '';
let toastTimer;
let packageOffset = 0;

const savedItems = new Set();

// Restore saved favourites from localStorage.
try {
  const stored = JSON.parse(localStorage.getItem('roamly-saved') || '[]');

  if (Array.isArray(stored)) {
    stored.forEach(item => savedItems.add(String(item)));
  }
} catch (error) {
  // The website still works if browser storage is unavailable.
}

// Display temporary notification messages.
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');

  window.clearTimeout(toastTimer);

  toastTimer = window.setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}

// Save favourites and update the interface.
function saveFavourites() {
  try {
    localStorage.setItem(
      'roamly-saved',
      JSON.stringify([...savedItems])
    );
  } catch (error) {
    // Saving is optional if storage is disabled.
  }

  renderSavedItems();
  updateFavouriteButtons();
}

// Update the favourite buttons and counter.
function updateFavouriteButtons() {
  $$('[data-favorite]').forEach(button => {
    const name = button.dataset.favorite;
    const isSaved = savedItems.has(name);

    button.setAttribute('aria-pressed', String(isSaved));
    button.textContent = isSaved ? '♥' : '♡';
  });

  savedCount.textContent = String(savedItems.size);
}

// Display the saved destinations.
function renderSavedItems() {
  savedList.replaceChildren();

  savedEmpty.hidden = savedItems.size > 0;

  savedItems.forEach(name => {
    const row = document.createElement('div');
    row.className = 'saved-item';

    const copy = document.createElement('div');

    const title = document.createElement('strong');
    title.textContent = name;

    const subtitle = document.createElement('span');
    subtitle.textContent = 'Saved for your next adventure';

    copy.append(title, subtitle);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';

    remove.setAttribute(
      'aria-label',
      `Remove ${name} from saved items`
    );

    remove.addEventListener('click', () => {
      savedItems.delete(name);
      saveFavourites();
      showToast(`${name} removed from your shortlist`);
    });

    row.append(copy, remove);
    savedList.append(row);
  });
}

// Search and filter the destinations.
function applyDestinationFilters() {
  let shown = 0;

  destinationCards.forEach(card => {
    const categories = (card.dataset.category || '').split(' ');

    const searchable = (
      `${card.dataset.name || ''} ` +
      `${card.querySelector('h3')?.textContent || ''}`
    ).toLowerCase();

    const matchesCategory =
      activeCategory === 'all' ||
      categories.includes(activeCategory);

    const matchesSearch =
      !searchTerm || searchable.includes(searchTerm);

    const visible = matchesCategory && matchesSearch;

    card.hidden = !visible;

    if (visible) shown++;
  });

  resultsLabel.textContent =
    `Showing ${shown} destination${shown === 1 ? '' : 's'}`;

  emptyState.hidden = shown !== 0;
}

// Select a destination category.
function chooseCategory(category) {
  activeCategory = category;

  filterButtons.forEach(button => {
    const selected = button.dataset.filter === category;

    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });

  applyDestinationFilters();
}

// Category filter buttons.
filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    chooseCategory(button.dataset.filter);
  });
});

// Reset the filters and search.
$('#reset-filters').addEventListener('click', () => {
  searchTerm = '';
  searchDestination.value = '';
  searchVibe.value = 'all';

  searchForm.dataset.searching = 'false';

  chooseCategory('all');
});

// Handle the trip search form.
searchForm.addEventListener('submit', event => {
  event.preventDefault();

  searchTerm = searchDestination.value.trim().toLowerCase();

  searchForm.dataset.searching = 'true';

  chooseCategory(searchVibe.value);

  $('#destinations').scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });

  const matchCount = destinationCards.filter(
    card => !card.hidden
  ).length;

  if (matchCount === 0) {
    showToast(
      'No exact match yet. Try a different destination or travel style.'
    );
  } else {
    showToast(
      `Found ${matchCount} destination${matchCount === 1 ? '' : 's'} for your trip`
    );
  }
});

// Update results while typing after the first search.
searchDestination.addEventListener('input', () => {
  if (searchForm.dataset.searching === 'true') {
    searchTerm = searchDestination.value.trim().toLowerCase();
    applyDestinationFilters();
  }
});

// Favourite buttons.
$$('[data-favorite]').forEach(button => {
  button.addEventListener('click', () => {
    const name = button.dataset.favorite;

    if (savedItems.has(name)) {
      savedItems.delete(name);
      showToast(`${name} removed from saved items`);
    } else {
      savedItems.add(name);
      showToast(`${name} added to your shortlist`);
    }

    saveFavourites();
  });
});

// Open a dialog box.
function openDialog(dialog) {
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }

  document.body.classList.add('dialog-open');
}

// Close a dialog box.
function closeDialog(dialog) {
  if (typeof dialog.close === 'function') {
    dialog.close();
  } else {
    dialog.removeAttribute('open');
  }

  if (!bookingDialog.open && !savedDialog.open) {
    document.body.classList.remove('dialog-open');
  }
}

// Open the booking enquiry form.
function openBooking(tripName = '') {
  bookingTrip.value = tripName;

  bookingFeedback.textContent = '';
  bookingFeedback.className = 'booking-feedback';

  openDialog(bookingDialog);

  window.setTimeout(() => {
    (tripName ? $('#booking-name') : bookingTrip).focus();
  }, 70);
}

// Booking buttons.
$$('[data-book]').forEach(button => {
  button.addEventListener('click', () => {
    openBooking(button.dataset.book);
  });
});

// Dialog close buttons.
$$('.dialog-close').forEach(button => {
  button.addEventListener('click', () => {
    closeDialog(button.closest('dialog'));
  });
});

// Close dialogs when clicking their backdrop.
$$('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      closeDialog(dialog);
    }
  });

  dialog.addEventListener('close', () => {
    if (!bookingDialog.open && !savedDialog.open) {
      document.body.classList.remove('dialog-open');
    }
  });
});

// Open the saved destinations dialog.
$('#show-saved').addEventListener('click', () => {
  renderSavedItems();
  openDialog(savedDialog);
});

// Prevent visitors from selecting a date in the past.
function setMinDate(input) {
  const today = new Date();

  const localDate = new Date(
    today.getTime() - today.getTimezoneOffset() * 60000
  ).toISOString().slice(0, 10);

  input.min = localDate;
}

setMinDate($('#search-date'));
setMinDate(bookingDate);

// Handle trip enquiry submission.
bookingForm.addEventListener('submit', event => {
  event.preventDefault();

  if (!bookingForm.reportValidity()) return;

  const formData = new FormData(bookingForm);

  const name = String(formData.get('name') || '').trim();
  const trip = String(formData.get('trip') || '').trim();

  bookingFeedback.className = 'booking-feedback';

  bookingFeedback.textContent =
    `Thanks, ${name}! Your demo enquiry for ${trip} is ready. ` +
    'No booking has been sent to a travel provider.';

  bookingForm.reset();

  bookingTrip.value = trip;

  showToast('Trip enquiry preview created');
});

// Handle newsletter form submission.
$('#newsletter-form').addEventListener('submit', event => {
  event.preventDefault();

  const emailInput = $('#newsletter-email');
  const feedback = $('#newsletter-feedback');

  if (!emailInput.checkValidity()) {
    emailInput.reportValidity();
    return;
  }

  feedback.textContent =
    `Thanks for joining, ${emailInput.value.trim()}! ` +
    'This demo form does not send emails yet.';

  feedback.classList.add('success');

  emailInput.value = '';
});

// Close the announcement bar.
$('.announcement-close').addEventListener('click', () => {
  $('.announcement-bar').remove();
});

// Mobile navigation menu.
const menuToggle = $('.menu-toggle');
const primaryNav = $('#primary-nav');

menuToggle.addEventListener('click', () => {
  const isOpen =
    menuToggle.getAttribute('aria-expanded') === 'true';

  menuToggle.setAttribute(
    'aria-expanded',
    String(!isOpen)
  );

  menuToggle.setAttribute(
    'aria-label',
    isOpen ? 'Open navigation' : 'Close navigation'
  );

  primaryNav.classList.toggle('open', !isOpen);
});

// Close the mobile menu after clicking a navigation link.
$$('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    primaryNav.classList.remove('open');

    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
  });
});

// Move the travel packages carousel.
function movePackages(direction) {
  const grid = $('#package-grid');
  const cards = $$('.package-card', grid);

  if (!cards.length) return;

  const visibleCards =
    window.innerWidth <= 760 ? 1 :
    window.innerWidth <= 1050 ? 2 : 4;

  const maxOffset = Math.max(
    0,
    cards.length - visibleCards
  );

  packageOffset = Math.max(
    0,
    Math.min(maxOffset, packageOffset + direction)
  );

  const step =
    cards[0].getBoundingClientRect().width +
    parseFloat(getComputedStyle(grid).columnGap || '0');

  grid.style.transform =
    `translateX(${-packageOffset * step}px)`;

  $('#package-prev').disabled = packageOffset === 0;
  $('#package-next').disabled = packageOffset === maxOffset;

  $('#package-prev').style.opacity =
    packageOffset === 0 ? '.45' : '1';

  $('#package-next').style.opacity =
    packageOffset === maxOffset ? '.45' : '1';
}

// Carousel navigation buttons.
$('#package-prev').addEventListener('click', () => {
  movePackages(-1);
});

$('#package-next').addEventListener('click', () => {
  movePackages(1);
});

// Reset the carousel after the browser is resized.
window.addEventListener('resize', () => {
  packageOffset = 0;
  $('#package-grid').style.transform = 'translateX(0)';
  movePackages(0);
});

// Display the current year in the footer.
$('#current-year').textContent = String(
  new Date().getFullYear)