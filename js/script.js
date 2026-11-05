const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const dateForm = document.getElementById('dateForm');
const searchButton = document.getElementById('getImagesButton');
const gallery = document.getElementById('gallery');
const galleryStatus = document.getElementById('galleryStatus');
const modal = document.getElementById('imageModal');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalImage = document.getElementById('modalImage');
const modalExplanation = document.getElementById('modalExplanation');
const closeModal = document.getElementById('closeModal');
const proxyUrl = document.body.dataset.proxyUrl;

setupDateInputs(startInput, endInput);

// LevelUp: choose one random space fact on each page load.
const spaceFacts = [
  'Sunlight takes about eight minutes to reach Earth.',
  'Venus takes longer to rotate once than it takes to orbit the Sun.',
  'Mars is home to Olympus Mons, the largest volcano in the solar system.',
  'Saturn’s rings are made mostly of ice particles.',
];

const factIndex = Math.floor(Math.random() * spaceFacts.length);
document.getElementById('spaceFact').textContent = spaceFacts[factIndex];

let lastFocusedButton;

closeModal.addEventListener('click', () => modal.close());

modal.addEventListener('close', () => {
  modalImage.removeAttribute('src');
  lastFocusedButton?.focus();
});

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function isWebUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function openModal(entry, button) {
  lastFocusedButton = button;
  modalTitle.textContent = entry.title;
  modalDate.textContent = formatDate(entry.date);
  modalImage.src = isWebUrl(entry.hdurl) ? entry.hdurl : entry.url;
  modalImage.alt = entry.title;
  modalExplanation.textContent =
    entry.explanation || 'NASA did not provide an explanation for this image.';
  modal.showModal();
}

function createCard(entry) {
  const card = document.createElement('article');
  card.className = 'gallery-item';

  const title = document.createElement('h2');
  title.textContent = entry.title;

  const date = document.createElement('p');
  date.className = 'card-date';
  date.textContent = formatDate(entry.date);

  if (entry.media_type === 'image') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'image-button';
    button.setAttribute('aria-label', `View larger image of ${entry.title}`);

    const image = document.createElement('img');
    image.src = isWebUrl(entry.url) ? entry.url : entry.hdurl;
    image.alt = entry.title;
    image.loading = 'lazy';

    button.append(image);
    button.addEventListener('click', () => openModal(entry, button));
    card.append(button, title, date);
  } else {
    // LevelUp: give video entries a Watch video link.
    const link = document.createElement('a');
    link.href = entry.url;
    link.textContent = 'Watch video';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    card.append(title, date, link);
  }

  return card;
}

dateForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (searchButton.disabled) return;

  const start = startInput.value;
  const end = endInput.value;

  if (start > end) {
    galleryStatus.textContent = 'Choose a start date on or before the end date.';
    return;
  }

  searchButton.disabled = true;
  gallery.replaceChildren();
  galleryStatus.textContent = 'Loading space photos…';

  try {
    const url = new URL(proxyUrl, window.location.href);
    url.searchParams.set('start_date', start);
    url.searchParams.set('end_date', end);

    const response = await fetch(url);

    if (response.status === 429) {
      throw new Error('NASA’s request limit was reached. Try again later.');
    }

    if (!response.ok) {
      throw new Error(`The gallery request returned HTTP ${response.status}.`);
    }

    const data = await response.json();
    const entries = (Array.isArray(data) ? data : [data]).filter((entry) => {
      if (entry?.media_type === 'image') {
        return isWebUrl(entry.url) || isWebUrl(entry.hdurl);
      }

      return entry?.media_type === 'video' && isWebUrl(entry.url);
    });

    gallery.replaceChildren(...entries.map(createCard));
    galleryStatus.textContent = entries.length
      ? `Found ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}.`
      : 'No space images or videos were found for those dates.';
  } catch (error) {
    galleryStatus.textContent = `Unable to load the gallery. ${error.message}`;
  } finally {
    searchButton.disabled = false;
  }
});