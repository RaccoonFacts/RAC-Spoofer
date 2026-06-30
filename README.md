# 🦝 RAC Spoofer

A chaos browser spoofer — pretend you're browsing on a toaster, fridge, or NASA supercomputer.

Built by [RaccoonFacts](https://github.com/RaccoonFacts) as a personal tool for trolling dev teams and testing responsive design edge cases.

---

## What it does

RAC Spoofer spoofs the following browser properties at the page level before any site scripts run:

- `window.innerWidth` / `innerHeight` / `outerWidth` / `outerHeight`
- `screen.width` / `height` / `availWidth` / `availHeight` / `colorDepth` / `pixelDepth`
- `navigator.userAgent` / `platform` / `vendor` / `hardwareConcurrency` / `deviceMemory`
- `window.devicePixelRatio`
- WebGL vendor and renderer strings
- Canvas fingerprint (pixel-level noise injection)
- HTTP `User-Agent` header and all `sec-ch-ua` Client Hints headers

---

## Architecture

RAC Spoofer is a two-part system:

### Chrome Extension
- MV3 Chrome extension with a service worker
- Registers `inject.js` as a `MAIN` world content script at `document_start`
- Spoofs HTTP headers via `declarativeNetRequest`
- Popup lets you pick presets, customize individual fields, randomize, or enable auto-chaos mode

### Windows Tray App (C# / WinForms)
- Runs in the system tray, listens on `http://localhost:9876`
- Dynamically writes `inject.js` with baked-in spoof values when you change profiles
- On first run, prompts you to select your extension folder — saves to `config.json`
- Falls back to system icon if `raccoon.ico` is not present

This two-part approach is necessary because Chrome MV3 extensions cannot write files to disk, and `document_start` MAIN world injection requires the script file to exist before any page scripts run.

---

## Preset Profiles

| Profile | Size | UA |
|---|---|---|
| Toaster | 240x180 | Bread OS 3.1 |
| Smart Fridge | 800x1280 | SamsungColdOS 11 |
| Microwave | 160x90 | BeepOS 1.0 |
| Cursed Widescreen | 5000x100 | PanoramaOS |
| Postage Stamp | 10x10 | TinyOS 0.1 |
| Potato PC | 320x240 | StarchOS 98 |
| NASA Supercomputer | 7680x4320 | GalaxyOS 2049 |
| Smartwatch | 44x44 | TickOS 2.1 |
| VR Headset | 4096x2048 | MetaOS 3.0 |
| Billboard | 14400x48 | OutdoorOS 1.0 |
| Game Boy | 160x144 | NintendOS 1989 |
| Calculator | 96x64 | TexasOS 2.0 |
| Tesla Dashboard | 1200x900 | AutopilotOS 12 |
| ATM Machine | 800x600 | BankOS 2000 |
| Dot Matrix Printer | 80x66 | PrintOS 1.0 (Paper/Jamming) |
| Etch A Sketch | 240x160 | KnobOS 1.0 |
| Smart Toothbrush | 32x8 | OralOS 1.0 |
| Dishwasher | 480x272 | SoapOS 3.0 |
| Smoke Alarm | 16x16 | BeepOS 9.1 |
| Mars Rover | 1024x768 | NASAOS 2031 |

---

## Installation

### Requirements
- Windows 10/11
- .NET 10 SDK
- Google Chrome (any recent version)

### 1. Build the tray app

```bash
cd RacSpooferTray
dotnet build
dotnet run
```

On first run a folder picker will appear — select your `RAC-Spoof` extension folder. This saves to `config.json` and won't ask again.

### 2. Load the Chrome extension

1. Go to `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load Unpacked**
4. Select the `RAC-Spoof` folder

### 3. Use it

1. Make sure the tray app is running (system tray icon)
2. Click the RAC Spoofer icon in Chrome toolbar
3. Pick a preset or configure custom overrides
4. Hit **Apply**
5. Hard reload (`Ctrl+Shift+R`) any tab to see the spoof in effect

---

## Custom Overrides

On top of any preset you can override:

- Screen width / height
- Browser (Chrome, Firefox, Safari, Edge, IE11, or custom UA string)
- OS string
- Navigator platform
- Navigator vendor
- WebGL vendor and renderer
- CPU core count
- RAM amount

Overrides are additive — preset values load first, only explicitly set overrides replace them.

---

## File Structure

```
RAC-Spoof/                  Chrome extension
  manifest.json
  background.js
  popup.html
  popup.js
  inject.js                 Written dynamically by tray app

RacSpooferTray/             C# tray app
  Program.cs
  RacSpooferTray.csproj
  raccoon.ico               Optional - tray icon
  config.json               Auto-generated on first run
```

---

## Notes

- The tray app must be running for profile changes to take effect
- After applying a profile, hard reload (`Ctrl+Shift+R`) the target tab
- `inject.js` is overwritten every time you change profiles
- Screen resolution (OS level) cannot be spoofed via JS — only JS-readable properties are affected
- Canvas fingerprint spoofing shifts pixel values by 1 — enough to break hash-based fingerprinting

---

## License

MIT
