// DOM Elements
const form = document.getElementById('url-form');
const input = document.getElementById('url-input');
const errorEl = document.getElementById('error-message');
const resultsContainer = document.getElementById('results-container');
const clearHistoryBtn = document.getElementById('clear-history');
const submitBtn = form.querySelector('button[type="submit"]');
const btnText = submitBtn.querySelector('.btn-text');
const spinner = submitBtn.querySelector('.loading-spinner');
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

// Constants
const STORAGE_KEY = 'shortenedUrls';
const MAX_HISTORY = 10;
let lastRequestTime = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  renderUrlList();
  setupMobileMenu();
  setupEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
  form.addEventListener('submit', handleFormSubmit);
  clearHistoryBtn.addEventListener('click', handleClearHistory);
  input.addEventListener('input', clearErrorOnType);
  document.addEventListener('click', handleCopyClick);
}

// Mobile Menu Toggle
function setupMobileMenu() {
  hamburger.addEventListener('click', () => {
    const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
    hamburger.setAttribute('aria-expanded', !isExpanded);
    navLinks.classList.toggle('nav-active');
    document.body.style.overflow = isExpanded ? 'auto' : 'hidden';
  });

  // Close menu when clicking on links
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.setAttribute('aria-expanded', 'false');
      navLinks.classList.remove('nav-active');
      document.body.style.overflow = 'auto';
    });
  });
}

// Form Handling
async function handleFormSubmit(e) {
  e.preventDefault();
  resetFormState();
  
  const url = input.value.trim();
  
  if (!url) {
    showError("Please add a link");
    return;
  }

  try {
    toggleLoading(true);
    const shortenedUrl = await shortenUrlWithRetry(url);
    saveUrl(url, shortenedUrl);
    renderUrlList();
    input.value = '';
  } catch (error) {
    showError(error.message);
  } finally {
    toggleLoading(false);
  }
}

// Clear error when typing
function clearErrorOnType() {
  if (input.value.trim() !== '') {
    resetFormState();
  }
}

// URL Shortening
async function shortenUrlWithRetry(url, retries = 2) {
  try {
    return await shortenUrl(url);
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, 1000));
    return await shortenUrlWithRetry(url, retries - 1);
  }
}

async function shortenUrl(url) {
  const now = Date.now();
  if (now - lastRequestTime < 1000) {
    throw new Error("Please wait a moment before shortening another link");
  }
  lastRequestTime = now;

  try {
    const response = await fetch(`https://api.shrtco.de/v2/shorten?url=${encodeURIComponent(url)}`);
    const data = await response.json();
    return data.result.full_short_link;
  } catch (error) {
    throw new Error("Failed to shorten URL. Please try again.");
  }
}

// History Management
function handleClearHistory() {
  if (confirm("Clear all shortened links?")) {
    localStorage.removeItem(STORAGE_KEY);
    renderUrlList();
  }
}

function renderUrlList() {
  const savedUrls = getSavedUrls();
  resultsContainer.innerHTML = '';

  if (savedUrls.length === 0) {
    resultsContainer.innerHTML = '<p class="no-results">No shortened links yet</p>';
    clearHistoryBtn.style.display = 'none';
    return;
  }

  clearHistoryBtn.style.display = 'block';

  savedUrls.forEach(url => {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `
      <p class="original-url">${truncateText(url.original, 40)}</p>
      <div class="result-right">
        <a href="${url.shortened}" target="_blank" class="shortened-url">${url.shortened}</a>
        <button class="btn btn-square copy-btn" data-url="${url.shortened}">
          <span class="btn-text">Copy</span>
        </button>
      </div>
    `;
    resultsContainer.appendChild(card);
  });
}

function getSavedUrls() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function saveUrl(original, shortened) {
  const history = getSavedUrls();
  const newItem = { original, shortened, id: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([newItem, ...history].slice(0, MAX_HISTORY)));
}

// Copy Functionality
function handleCopyClick(e) {
  const copyBtn = e.target.closest('.copy-btn');
  if (!copyBtn) return;

  const url = copyBtn.dataset.url;
  copyToClipboard(url, copyBtn);
}

async function copyToClipboard(url, copyBtn) {
  try {
    await navigator.clipboard.writeText(url);
    showToast("Copied to clipboard!");
    updateCopyButtonState(copyBtn);
  } catch (err) {
    showToast("Failed to copy");
  }
}

function updateCopyButtonState(copyBtn) {
  copyBtn.classList.add('copied');
  copyBtn.querySelector('.btn-text').textContent = 'Copied!';
  setTimeout(() => {
    copyBtn.classList.remove('copied');
    copyBtn.querySelector('.btn-text').textContent = 'Copy';
  }, 2000);
}

// Helper Functions
function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.add('active');
  input.classList.add('invalid');
}

function resetFormState() {
  errorEl.textContent = '';
  errorEl.classList.remove('active');
  input.classList.remove('invalid');
}

function toggleLoading(isLoading) {
  btnText.classList.toggle('hidden', isLoading);
  spinner.classList.toggle('hidden', !isLoading);
  submitBtn.disabled = isLoading;
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

function truncateText(text, maxLength) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}