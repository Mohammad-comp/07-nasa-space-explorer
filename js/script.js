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

async function fetchEntries(start, end) {
  const dates = [];
  const day = new Date(start);
  const lastDay = new Date(end);
  while (day <= lastDay) {
    dates.push(day.toISOString().slice(2, 10).replaceAll('-', ''));
    day.setUTCDate(day.getUTCDate() + 1);
  }

  const entries = [];
  for (let index = 0; index < dates.length; index += 6) {
    const batch = await Promise.all(dates.slice(index, index + 6).map(async (date) => {
      const response = await fetch(proxyUrl + '/' + date, {
        signal: AbortSignal.timeout(15000),
      });
      if (response.status === 404) return null;
      if (response.status === 429) {
        throw new Error('NASA’s request limit was reached. Try again later.');
      }
      if (response.status === 503) throw new Error('This date is not cached. Go online and load it first.');
      if (!response.ok) throw new Error('NASA returned HTTP ' + response.status + '.');

      const entry = await response.json();
      if (entry.media_type === 'image' && isWebUrl(entry.hdurl)) {
        const explanation = new DOMParser().parseFromString(
          entry.explanation || '', 'text/html'
        ).body.textContent.trim();
        return { ...entry, url: entry.hdurl, explanation };
      }
      if (entry.media_type === 'video' || entry.media_type === 'iframe') {
        const url = entry.permalink || entry.url;
        if (isWebUrl(url)) return { ...entry, url };
      }
      return null;
    }));
    entries.push(...batch.filter(Boolean));
  }
  return entries;
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
    await offlineReady;
    const entries = await fetchEntries(start, end);
    try {
      localStorage.setItem('space-explorer-last-range', JSON.stringify({ start, end }));
    } catch { /* The gallery still works when storage is unavailable. */ }

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
// PWA: show connectivity changes and register the offline worker.
const installButton = document.getElementById('installApp');
const installStatus = document.getElementById('installStatus');
const notificationButton = document.getElementById('enableNotifications');
const notificationStatus = document.getElementById('notificationStatus');
const offlineStatus = document.getElementById('offlineStatus');
let installEvent;

function updateConnection() {
  offlineStatus.hidden = navigator.onLine;
}
window.addEventListener('online', updateConnection);
window.addEventListener('offline', updateConnection);
updateConnection();

const offlineReady = 'serviceWorker' in navigator
  ? navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
    .then(() => navigator.serviceWorker.ready)
    .then(async () => {
      if (!navigator.serviceWorker.controller) {
        await new Promise(resolve => {
          navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
          setTimeout(resolve, 3000);
        });
      }
    })
    .catch(() => { installStatus.textContent = 'Offline setup failed. Refresh while online to try again.'; })
  : Promise.resolve();

// Keep the browser's install event until the visitor presses our custom button.
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installEvent = event;
  installButton.hidden = false;
  installStatus.textContent = 'Install Space Explorer for quick access from your home screen.';
});
function showInstalled() {
  installButton.hidden = true;
  installStatus.textContent = 'Space Explorer is running as an installed app.';
}
if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) {
  showInstalled();
}
window.addEventListener('appinstalled', showInstalled);
installButton.addEventListener('click', async () => {
  if (!installEvent) {
    installStatus.textContent = /iPad|iPhone|iPod/.test(navigator.userAgent)
      ? 'In Safari, tap Share, then Add to Home Screen, and confirm Add. Open the app from its new home-screen icon.'
      : 'Use your browser menu to install Space Explorer. If the install option is still loading, wait a moment and press Install app again.';
    return;
  }
  const prompt = installEvent;
  installEvent = null;
  await prompt.prompt();
  const choice = await prompt.userChoice;
  installStatus.textContent = choice.outcome === 'accepted'
    ? 'Installation accepted. Open Space Explorer from your apps.'
    : 'Installation dismissed. You can keep exploring in your browser.';
});

// Permission is requested only after the visitor explicitly presses this button.
function updateNotificationButton() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    notificationButton.disabled = true;
    notificationStatus.textContent = 'Notifications are unavailable here. On iPhone, open the installed home-screen app to try them.';
  } else if (Notification.permission === 'denied') {
    notificationButton.disabled = true;
    notificationStatus.textContent = 'Notifications are blocked. You can change this in your browser site settings.';
  } else {
    notificationButton.textContent = Notification.permission === 'granted'
      ? 'Send test notification' : 'Enable notifications';
  }
}
updateNotificationButton();
notificationButton.addEventListener('click', async () => {
  try {
    const permission = await Notification.requestPermission();
    updateNotificationButton();
    if (permission !== 'granted') {
      notificationStatus.textContent = permission === 'denied'
        ? 'Notifications are blocked in site settings.' : 'Permission was dismissed. Press Enable notifications to try again.';
      return;
    }
    await offlineReady;
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification('NASA Space Explorer', {
      body: 'Notifications are enabled. Your next space discovery is waiting!',
      icon: './img/icon-192.png', tag: 'space-explorer-test',
    });
    notificationStatus.textContent = 'Notifications enabled. A test notification was sent.';
  } catch {
    notificationStatus.textContent = 'Notifications could not be enabled here. Try the installed app or check browser permissions.';
  }
});

// Restore the last searched dates after an offline reload.
if (!navigator.onLine) {
  try {
    const saved = JSON.parse(localStorage.getItem('space-explorer-last-range'));
    if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved.start) &&
        /^\d{4}-\d{2}-\d{2}$/.test(saved.end)) {
      startInput.value = saved.start;
      endInput.value = saved.end;
      offlineReady.then(() => dateForm.requestSubmit());
    }
  } catch { /* Let the visitor choose a range if there is no saved search. */ }
}
