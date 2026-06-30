const profileKeys = [
  'toaster','fridge','microwave','widescreen','postage_stamp',
  'potato','nasa','smartwatch','vr_headset','billboard',
  'gameboy','calculator','tesla','atm','dot_matrix',
  'etch_a_sketch','toothbrush','dishwasher','smoke_alarm','mars_rover'
];

const browserUAs = {
  chrome:  (os) => `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36`,
  firefox: (os) => `Mozilla/5.0 (${os}; rv:128.0) Gecko/20100101 Firefox/128.0`,
  safari:  (os) => `Mozilla/5.0 (${os}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15`,
  edge:    (os) => `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0`,
  ie11:    (os) => `Mozilla/5.0 (${os}; Trident/7.0; rv:11.0) like Gecko`,
};

const sel       = (id) => document.getElementById(id);
const status    = sel('status');
const chaosBox  = sel('chaos');
let chaosTimer  = null;

// Toggle custom text inputs
function wire(selectId, inputId) {
  sel(selectId).addEventListener('change', () => {
    sel(inputId).style.display = sel(selectId).value === 'custom' ? 'block' : 'none';
  });
}
wire('cBrowser',     'cUACustom');
wire('cOS',          'cOSCustom');
wire('cPlatform',    'cPlatformCustom');
wire('cVendor',      'cVendorCustom');
wire('cWebGLVendor', 'cWebGLVendorCustom');
wire('cWebGLRenderer','cWebGLRendererCustom');

function getVal(selectId, inputId) {
  const s = sel(selectId);
  return s.value === 'custom' ? sel(inputId).value.trim() : s.value;
}

chrome.storage.local.get(['profile','chaosMode'], ({ profile, chaosMode }) => {
  if (profile) sel('profile').value = profile;
  chaosBox.checked = !!chaosMode;
});

function sendToTray(preset, overrides) {
  const params = new URLSearchParams({ profile: preset });
  for (const [k, v] of Object.entries(overrides)) {
    if (v !== null && v !== undefined && v !== '')
      params.set(k, v);
  }
  return fetch(`http://localhost:9876/?${params}`)
    .then(r => r.json())
    .catch(() => null);
}

function buildOverrides() {
  const overrides = {};

  const w = parseInt(sel('cWidth').value);
  const h = parseInt(sel('cHeight').value);
  if (w) overrides.w = w;
  if (h) overrides.h = h;

  const browser = sel('cBrowser').value;
  if (browser) {
    if (browser === 'custom') {
      overrides.ua = sel('cUACustom').value.trim();
    } else {
      const os = getVal('cOS', 'cOSCustom');
      if (os) overrides.ua = browserUAs[browser](os);
    }
  }

  const platform = getVal('cPlatform', 'cPlatformCustom');
  if (platform) overrides.platform = platform;

  const vendor = getVal('cVendor', 'cVendorCustom');
  if (vendor !== undefined && sel('cVendor').value !== '') overrides.vendor = vendor;

  const wglVendor = getVal('cWebGLVendor', 'cWebGLVendorCustom');
  if (wglVendor) overrides.wglVendor = wglVendor;

  const wglRenderer = getVal('cWebGLRenderer', 'cWebGLRendererCustom');
  if (wglRenderer) overrides.wglRenderer = wglRenderer;

  const cores = sel('cCores').value;
  if (cores) overrides.cores = cores;

  const ram = sel('cRAM').value;
  if (ram) overrides.ram = ram;

  return overrides;
}

// Apply preset + overrides
sel('apply').addEventListener('click', async () => {
  const preset    = sel('profile').value;
  const overrides = buildOverrides();
  const data      = await sendToTray(preset, overrides);
  if (data?.success) {
    chrome.storage.local.set({ profile: preset });
    status.textContent = preset === 'none' ? 'Off' : `Applied: ${preset.replace(/_/g,' ')}`;
  } else {
    status.textContent = 'Tray app not running';
  }
});

// Random
sel('random').addEventListener('click', async () => {
  const key  = profileKeys[Math.floor(Math.random() * profileKeys.length)];
  const data = await sendToTray(key, {});
  if (data?.success) {
    sel('profile').value = key;
    chrome.storage.local.set({ profile: key });
    status.textContent = `Rolled: ${key.replace(/_/g,' ')}`;
  }
});

// Auto chaos
chaosBox.addEventListener('change', () => {
  chrome.storage.local.set({ chaosMode: chaosBox.checked });
  if (chaosBox.checked) {
    status.textContent = 'Auto chaos active';
    chaosTimer = setInterval(async () => {
      const key  = profileKeys[Math.floor(Math.random() * profileKeys.length)];
      await sendToTray(key, {});
      sel('profile').value = key;
      chrome.storage.local.set({ profile: key });
      status.textContent = `Rotated: ${key.replace(/_/g,' ')}`;
    }, 3 * 60 * 1000);
  } else {
    clearInterval(chaosTimer);
    status.textContent = 'Auto chaos off';
  }
});