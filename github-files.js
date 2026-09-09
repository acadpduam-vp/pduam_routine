// Shared helper: lists files from a folder in this GitHub repo using
// GitHub's public API (no login needed for public repos).
//
// To add content: just upload a file to the relevant folder in the repo,
// named like 2026-09-08_Title-Of-Item.pdf — it shows up automatically.

const GITHUB_OWNER = 'acadpduam-vp';
const GITHUB_REPO = 'pduam_routine';

function githubFolderApiUrl(folderPath) {
  return 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/' + folderPath;
}

// Parses "2026-09-08_Title-Of-Item.pdf" into a date and a clean title.
// Falls back gracefully if a file doesn't follow the naming pattern.
function parseFileTitle(filename) {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})[_-]+(.+)\.[^.]+$/);

  if (!match) {
    return {
      date: '',
      sortKey: '0000-00-00',
      title: filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')
    };
  }

  const rawDate = match[1];
  const rawTitle = match[2].replace(/[_-]+/g, ' ').trim();

  const dateObj = new Date(rawDate + 'T00:00:00');
  const displayDate = isNaN(dateObj.getTime())
    ? rawDate
    : dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return {
    date: displayDate,
    sortKey: rawDate,
    title: rawTitle
  };
}

function escapeHtmlText(value) {
  const text = String(value === undefined || value === null ? '' : value);
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderFileCards(containerId, files) {
  const container = document.getElementById(containerId);

  if (files.length === 0) {
    container.innerHTML =
      '<div class="empty">Nothing uploaded here yet.</div>';
    return;
  }

  container.innerHTML = files.map(function(file) {
    return `
      <section class="notice-card">
        <div class="notice-card-header">
          <div class="notice-title">${escapeHtmlText(file.title)}</div>
          ${file.date ? `<div class="notice-date">${escapeHtmlText(file.date)}</div>` : ''}
        </div>
        <a class="notice-file-link" href="${file.downloadUrl}" target="_blank" rel="noopener">View / Download</a>
      </section>
    `;
  }).join('');
}

// Fetches and renders the contents of a folder into containerId.
// Shows a summary count into summaryId if provided.
function loadFolderFiles(folderPath, containerId, summaryId) {
  fetch(githubFolderApiUrl(folderPath))
    .then(function(response) {
      if (response.status === 404) {
        // Folder doesn't exist yet (no files uploaded)
        return [];
      }
      if (!response.ok) {
        throw new Error('GitHub API returned ' + response.status);
      }
      return response.json();
    })
    .then(function(items) {
      const rawFiles = (items || []).filter(function(item) {
        return item.type === 'file';
      });

      const files = rawFiles.map(function(file) {
        const parsed = parseFileTitle(file.name);
        return {
          title: parsed.title,
          date: parsed.date,
          sortKey: parsed.sortKey,
          downloadUrl: file.download_url
        };
      });

      files.sort(function(a, b) {
        return b.sortKey.localeCompare(a.sortKey);
      });

      if (summaryId) {
        document.getElementById(summaryId).textContent =
          files.length + ' item' + (files.length === 1 ? '' : 's');
      }

      renderFileCards(containerId, files);
    })
    .catch(function(error) {
      if (summaryId) {
        document.getElementById(summaryId).textContent = 'Unable to load.';
      }
      document.getElementById(containerId).innerHTML =
        '<div class="empty">Could not load right now. Please refresh, or check back later.</div>';
      console.error(error);
    });
}
