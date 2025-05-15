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
const REQUEST_COOLDOWN = 2000; // 2 seconds
let lastRequestTime = 0;

// Initialize
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
  renderUrlList();
  setupMobileMenu();
  setupEventListeners();
}

// Event Listeners
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
  
  // Validation checks
  if (!url) {
    showError("Please add a link");
    return;
  }

  if (!isValidUrl(url)) {
    showError("Please enter a valid URL (e.g., https://example.com)");
    return;
  }

  // Request cooldown check
  const now = Date.now();
  if (now - lastRequestTime < REQUEST_COOLDOWN) {
    showError("Please wait before submitting again");
    return;
  }
  lastRequestTime = now;

  try {
    // Show loading state
    toggleLoading(true);
    
    // Small delay to ensure spinner is visible
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const shortenedUrl = await shortenUrl(url);
    saveUrl(url, shortenedUrl);
    renderUrlList();
    input.value = '';
    showToast('URL shortened successfully!');
  } catch (error) {
    console.error('Shortening error:', error);
    showError(error.message || "Failed to shorten URL. Please try another URL or try again later.");
  } finally {
    toggleLoading(false);
  }
}

// URL Shortening with TinyURL
async function shortenUrl(url) {
  try {
    const apiUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);

    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    
    const result = await response.text();
    
    if (!result.startsWith("https://tinyurl.com/")) {
      throw new Error("Invalid response from TinyURL");
    }
    
    return result;
  } catch (error) {
    console.error("Shorten Error:", error);
    throw new Error("Failed to shorten URL. Please try again later.");
  }
}

// History Management
function handleClearHistory() {
  if (confirm("Clear all shortened links?")) {
    localStorage.removeItem(STORAGE_KEY);
    renderUrlList();
    showToast('History cleared successfully!');
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
  resultsContainer.append(...savedUrls.map(createUrlCard));
}

function createUrlCard(url) {
  const card = document.createElement('div');
  card.className = 'result-card';
  card.innerHTML = `
    <p class="original-url">${truncateText(url.original, 40)}</p>
    <div class="result-right">
      <a href="${url.shortened}" target="_blank" class="shortened-url">${url.shortened}</a>
      <button class="btn btn-square copy-btn" data-url="${url.shortened}">
        <span class="btn-text">Copy</span>
        <span class="copied-text">Copied!</span>
      </button>
    </div>
  `;
  return card;
}

// Storage Functions
function getSavedUrls() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveUrl(original, shortened) {
  const history = getSavedUrls();
  const newItem = { 
    original, 
    shortened, 
    id: Date.now(),
    timestamp: new Date().toISOString() 
  };
  const updatedHistory = [newItem, ...history].slice(0, MAX_HISTORY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
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
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = url;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast("Copied to clipboard!");
    updateCopyButtonState(copyBtn);
  }
}

function updateCopyButtonState(copyBtn) {
  copyBtn.classList.add('copied');
  setTimeout(() => {
    copyBtn.classList.remove('copied');
  }, 2000);
}

// Helper Functions
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.add('visible');
  input.classList.add('invalid');
}

function clearErrorOnType() {
  if (errorEl.classList.contains('visible')) {
    resetFormState();
  }
}

function resetFormState() {
  errorEl.textContent = '';
  errorEl.classList.remove('visible');
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