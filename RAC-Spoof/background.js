const REMOVE_HEADERS = [
  'sec-ch-ua','sec-ch-ua-mobile','sec-ch-ua-platform',
  'sec-ch-ua-full-version-list','sec-ch-ua-full-version',
  'sec-ch-ua-arch','sec-ch-ua-bitness','sec-ch-ua-model','sec-ch-ua-wow64'
];

const profileUAs = {
  toaster:       'Mozilla/5.0 (Toaster; Bread OS 3.1) ToastKit/1.0 BreadBrowser/2024',
  fridge:        'Mozilla/5.0 (SmartFridge; SamsungColdOS 11) FridgeKit/4.2 IceBrowser/2.0 (Cooling/Enabled)',
  microwave:     'Mozilla/5.0 (Microwave; BeepOS 1.0) MagnetronKit/900W NukerBrowser/1.0',
  widescreen:    'Mozilla/5.0 (UltraWide; PanoramaOS) StretchKit/5000 HorizonBrowser/1.0',
  postage_stamp: 'Mozilla/5.0 (PostageStamp; TinyOS 0.1) MicroKit/0.0001 StampBrowser/1.0',
  potato:        'Mozilla/5.0 (Potato; StarchOS 98) PotatoKit/1.0 SpudBrowser/1.0 (Mashed/Yes)',
  nasa:          'Mozilla/5.0 (NASASupercomputer; GalaxyOS 2049) CosmicKit/99.9 StarBrowser/1.0 (MissionControl/Active)',
  smartwatch:    'Mozilla/5.0 (Wristwatch; TickOS 2.1) WatchKit/1.0 TinyBrowser/1.0 (BatteryLife/2days)',
  vr_headset:    'Mozilla/5.0 (VRHeadset; MetaOS 3.0) VRKit/1.0 VoidBrowser/1.0 (Eyes/2)',
  billboard:     'Mozilla/5.0 (Billboard; OutdoorOS 1.0) SignKit/1.0 BillBoard/1.0 (Visibility/High)',
  gameboy:       'Mozilla/5.0 (GameBoy; NintendOS 1989) CartridgeKit/1.0 PixelBrowser/1.0 (AA-Batteries/4)',
  calculator:    'Mozilla/5.0 (TI-84; TexasOS 2.0) GraphKit/1.0 CalcBrowser/1.0 (Solar/Enabled)',
  tesla:         'Mozilla/5.0 (Tesla; AutopilotOS 12) ElectronKit/1.0 TeslaBrowser/1.0 (MPH/Ludicrous)',
  atm:           'Mozilla/5.0 (ATM; BankOS 2000) CashKit/1.0 MoneyBrowser/1.0 (Cash/Dispensing)',
  dot_matrix:    'Mozilla/5.0 (DotMatrixPrinter; PrintOS 1.0) InkKit/1.0 PrintBrowser/1.0 (Paper/Jamming)',
  etch_a_sketch: 'Mozilla/5.0 (EtchASketch; KnobOS 1.0) ShakeKit/1.0 SketchBrowser/1.0 (Erase/Shake)',
  toothbrush:    'Mozilla/5.0 (SmartToothbrush; OralOS 1.0) BristleKit/1.0 PlaqueBrowser/1.0 (Mint/Enabled)',
  dishwasher:    'Mozilla/5.0 (Dishwasher; SoapOS 3.0) RinseKit/1.0 SprayBrowser/1.0 (Cycle/Heavy)',
  smoke_alarm:   'Mozilla/5.0 (SmokeDetector; BeepOS 9.1) AlarmKit/1.0 PanicBrowser/1.0 (Battery/Low)',
  mars_rover:    'Mozilla/5.0 (MarsRover; NASAOS 2031) CuriosityKit/3.0 DustBrowser/1.0 (Signal-Delay/20min)',
};

async function reregisterContentScript() {
  try { await chrome.scripting.unregisterContentScripts({ ids: ['rac-spoof'] }); } catch {}
  await chrome.scripting.registerContentScripts([{
    id:                    'rac-spoof',
    matches:               ['<all_urls>'],
    js:                    ['inject.js'],
    world:                 'MAIN',
    runAt:                 'document_start',
    allFrames:             true,
    persistAcrossSessions: false
  }]);
}

async function writeInjectAndRegister(profile) {
  try {
    const res  = await fetch(`http://localhost:9876/?profile=${profile}`);
    const data = await res.json();
    if (data.success) {
      console.log('[RAC] inject.js written for profile:', profile);
      await reregisterContentScript();
    }
  } catch (e) {
    console.error('[RAC] Tray app not running:', e);
  }
}

function applyHeaders(profile) {
  const ua = profile && profile !== 'none' ? profileUAs[profile] : null;
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: ua ? [{
      id: 1, priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          { header: 'User-Agent', operation: 'set', value: ua },
          ...REMOVE_HEADERS.map(h => ({ header: h, operation: 'remove' }))
        ]
      },
      condition: {
        resourceTypes: ['main_frame','sub_frame','xmlhttprequest','script','image','stylesheet']
      }
    }] : []
  });
}

// Init on service worker startup
chrome.storage.local.get(['profile'], async ({ profile }) => {
  applyHeaders(profile);
  await reregisterContentScript(); // load whatever inject.js already has
  await writeInjectAndRegister(profile || 'none'); // update it from tray
});

// React to popup changes
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local' || !changes.profile) return;
  const key = changes.profile.newValue;
  applyHeaders(key);
  await writeInjectAndRegister(key || 'none');
});