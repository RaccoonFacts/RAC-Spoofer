// Runs at document_start — before any page script
chrome.storage.local.get(['profile'], ({ profile }) => {
  if (!profile || profile === 'none') return;

  const s = document.createElement('script');
  s.setAttribute('data-rac-profile', profile);
  s.src = chrome.runtime.getURL('inject.js');
  document.documentElement.prepend(s);
});