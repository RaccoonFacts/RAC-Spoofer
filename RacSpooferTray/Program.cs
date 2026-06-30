using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Windows.Forms;

class RacSpooferTray : ApplicationContext
{
    private NotifyIcon _tray;
    private HttpListener _listener;
    private readonly string _extDir;

    static readonly Dictionary<string, (int w, int h, string ua)> Profiles = new()
    {
        ["toaster"] = (240, 180, "Mozilla/5.0 (Toaster; Bread OS 3.1) ToastKit/1.0 BreadBrowser/2024"),
        ["fridge"] = (800, 1280, "Mozilla/5.0 (SmartFridge; SamsungColdOS 11) FridgeKit/4.2 IceBrowser/2.0 (Cooling/Enabled)"),
        ["microwave"] = (160, 90, "Mozilla/5.0 (Microwave; BeepOS 1.0) MagnetronKit/900W NukerBrowser/1.0"),
        ["widescreen"] = (5000, 100, "Mozilla/5.0 (UltraWide; PanoramaOS) StretchKit/5000 HorizonBrowser/1.0"),
        ["postage_stamp"] = (10, 10, "Mozilla/5.0 (PostageStamp; TinyOS 0.1) MicroKit/0.0001 StampBrowser/1.0"),
        ["potato"] = (320, 240, "Mozilla/5.0 (Potato; StarchOS 98) PotatoKit/1.0 SpudBrowser/1.0 (Mashed/Yes)"),
        ["nasa"] = (7680, 4320, "Mozilla/5.0 (NASASupercomputer; GalaxyOS 2049) CosmicKit/99.9 StarBrowser/1.0 (MissionControl/Active)"),
        ["smartwatch"] = (44, 44, "Mozilla/5.0 (Wristwatch; TickOS 2.1) WatchKit/1.0 TinyBrowser/1.0 (BatteryLife/2days)"),
        ["vr_headset"] = (4096, 2048, "Mozilla/5.0 (VRHeadset; MetaOS 3.0) VRKit/1.0 VoidBrowser/1.0 (Eyes/2)"),
        ["billboard"] = (14400, 48, "Mozilla/5.0 (Billboard; OutdoorOS 1.0) SignKit/1.0 BillBoard/1.0 (Visibility/High)"),
        ["gameboy"] = (160, 144, "Mozilla/5.0 (GameBoy; NintendOS 1989) CartridgeKit/1.0 PixelBrowser/1.0 (AA-Batteries/4)"),
        ["calculator"] = (96, 64, "Mozilla/5.0 (TI-84; TexasOS 2.0) GraphKit/1.0 CalcBrowser/1.0 (Solar/Enabled)"),
        ["tesla"] = (1200, 900, "Mozilla/5.0 (Tesla; AutopilotOS 12) ElectronKit/1.0 TeslaBrowser/1.0 (MPH/Ludicrous)"),
        ["atm"] = (800, 600, "Mozilla/5.0 (ATM; BankOS 2000) CashKit/1.0 MoneyBrowser/1.0 (Cash/Dispensing)"),
        ["dot_matrix"] = (80, 66, "Mozilla/5.0 (DotMatrixPrinter; PrintOS 1.0) InkKit/1.0 PrintBrowser/1.0 (Paper/Jamming)"),
        ["etch_a_sketch"] = (240, 160, "Mozilla/5.0 (EtchASketch; KnobOS 1.0) ShakeKit/1.0 SketchBrowser/1.0 (Erase/Shake)"),
        ["toothbrush"] = (32, 8, "Mozilla/5.0 (SmartToothbrush; OralOS 1.0) BristleKit/1.0 PlaqueBrowser/1.0 (Mint/Enabled)"),
        ["dishwasher"] = (480, 272, "Mozilla/5.0 (Dishwasher; SoapOS 3.0) RinseKit/1.0 SprayBrowser/1.0 (Cycle/Heavy)"),
        ["smoke_alarm"] = (16, 16, "Mozilla/5.0 (SmokeDetector; BeepOS 9.1) AlarmKit/1.0 PanicBrowser/1.0 (Battery/Low)"),
        ["mars_rover"] = (1024, 768, "Mozilla/5.0 (MarsRover; NASAOS 2031) CuriosityKit/3.0 DustBrowser/1.0 (Signal-Delay/20min)"),
    };

    public RacSpooferTray(string extDir)
    {
        _extDir = extDir;

        Icon trayIcon;
        try
        {
            var stream = typeof(RacSpooferTray).Assembly
                .GetManifestResourceStream("RacSpooferTray.raccoon.ico")!;
            trayIcon = new Icon(stream);
        }
        catch { trayIcon = SystemIcons.Application; }

        var menu = BuildMenu();
        _tray = new NotifyIcon
        {
            Icon = trayIcon,
            Text = "RAC Spoofer - Idle",
            Visible = true,
            ContextMenuStrip = menu
        };
        _tray.MouseClick += (s, e) => {
            if (e.Button == MouseButtons.Right)
                menu.Show(Cursor.Position);
        };

        _listener = new HttpListener();
        _listener.Prefixes.Add("http://localhost:9876/");

        try { _listener.Start(); }
        catch (Exception ex)
        {
            MessageBox.Show($"Failed to start listener on port 9876:\n{ex.Message}", "RAC Spoofer Error");
            Application.Exit();
            return;
        }

        new Thread(ListenLoop) { IsBackground = true }.Start();
    }

    ContextMenuStrip BuildMenu()
    {
        var menu = new ContextMenuStrip();
        menu.Items.Add("RAC Spoofer").Enabled = false;
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("Exit", null, (s, e) =>
        {
            _listener.Stop();
            _tray.Visible = false;
            Application.Exit();
        });
        return menu;
    }

    void ListenLoop()
    {
        while (_listener.IsListening)
        {
            try { HandleRequest(_listener.GetContext()); }
            catch { break; }
        }
    }

    void HandleRequest(HttpListenerContext ctx)
    {
        var req = ctx.Request;
        var resp = ctx.Response;

        resp.Headers.Add("Access-Control-Allow-Origin", "*");
        resp.Headers.Add("Access-Control-Allow-Methods", "GET, OPTIONS");

        if (req.HttpMethod == "OPTIONS") { resp.StatusCode = 200; resp.Close(); return; }

        try
        {
            string profile = req.QueryString["profile"] ?? "none";

            // Defaults
            int w = 1920;
            int h = 1080;
            string ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";
            string platform = "Win32";
            string vendor = "Google Inc.";
            string wglVendor = "Google Inc. (NVIDIA)";
            string wglRenderer = "ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)";
            int cores = 8;
            double ram = 8;

            // Apply preset if matched
            if (profile != "none" && Profiles.ContainsKey(profile))
            {
                (w, h, ua) = Profiles[profile];
                platform = "RaccoonOS";
                vendor = "Raccoon Inc.";
                wglVendor = "Raccoon Inc.";
                wglRenderer = "ToasterGPU 1.0";
                cores = 1;
                ram = 0.25;
            }

            // Apply overrides — only replace if param is present and non-empty
            if (int.TryParse(req.QueryString["w"], out var ow)) w = ow;
            if (int.TryParse(req.QueryString["h"], out var oh)) h = oh;
            if (int.TryParse(req.QueryString["cores"], out var oc)) cores = oc;
            if (double.TryParse(req.QueryString["ram"],
                System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out var or)) ram = or;

            string? qua = req.QueryString["ua"];
            string? qplt = req.QueryString["platform"];
            string? qvnd = req.QueryString["vendor"];
            string? qwgv = req.QueryString["wglVendor"];
            string? qwgr = req.QueryString["wglRenderer"];

            if (!string.IsNullOrEmpty(qua)) ua = Uri.UnescapeDataString(qua);
            if (!string.IsNullOrEmpty(qplt)) platform = Uri.UnescapeDataString(qplt);
            if (!string.IsNullOrEmpty(qvnd)) vendor = Uri.UnescapeDataString(qvnd);
            if (!string.IsNullOrEmpty(qwgv)) wglVendor = Uri.UnescapeDataString(qwgv);
            if (!string.IsNullOrEmpty(qwgr)) wglRenderer = Uri.UnescapeDataString(qwgr);

            if (profile == "none" && !req.QueryString.AllKeys.Any(k => k != "profile"))
                File.WriteAllText(Path.Combine(_extDir, "inject.js"), "// RAC Spoofer: no profile active", Encoding.UTF8);
            else
                WriteInjectJs(w, h, ua, platform, vendor, wglVendor, wglRenderer, cores, ram);

            _tray.Text = profile == "none"
                ? "RAC Spoofer - Idle"
                : $"RAC Spoofer - {profile.Replace('_', ' ')}";

            Respond(resp, 200, new { success = true, profile });
        }
        catch (Exception ex)
        {
            Respond(resp, 500, new { success = false, error = ex.Message });
        }
    }

    static void Respond(HttpListenerResponse resp, int status, object obj)
    {
        var buf = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(obj));
        resp.StatusCode = status;
        resp.ContentType = "application/json";
        resp.ContentLength64 = buf.Length;
        resp.OutputStream.Write(buf, 0, buf.Length);
        resp.Close();
    }

    void WriteInjectJs(int w, int h, string ua, string platform, string vendor,
        string wglVendor, string wglRenderer, int cores, double ram)
    {
        string js = $@"(function() {{
  const def = (o, k, v) => Object.defineProperty(o, k, {{ get: () => v, configurable: true }});
  def(window,    'innerWidth',          {w});
  def(window,    'innerHeight',         {h});
  def(window,    'outerWidth',          {w});
  def(window,    'outerHeight',         {h});
  def(screen,    'width',               {w});
  def(screen,    'height',              {h});
  def(screen,    'availWidth',          {w});
  def(screen,    'availHeight',         {h});
  def(screen,    'colorDepth',          8);
  def(screen,    'pixelDepth',          8);
  def(navigator, 'userAgent',           {JsonSerializer.Serialize(ua)});
  def(navigator, 'platform',            {JsonSerializer.Serialize(platform)});
  def(navigator, 'vendor',              {JsonSerializer.Serialize(vendor)});
  def(navigator, 'hardwareConcurrency', {cores});
  def(navigator, 'deviceMemory',        {ram.ToString(System.Globalization.CultureInfo.InvariantCulture)});

  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(type) {{
    if (this.width > 16 && this.height > 16) {{
      const ctx = this.getContext('2d');
      if (ctx) {{
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {{
          imageData.data[i]     = (imageData.data[i]     + 1) % 256;
          imageData.data[i + 1] = (imageData.data[i + 1] + 1) % 256;
        }}
        ctx.putImageData(imageData, 0, 0);
      }}
    }}
    return origToDataURL.apply(this, arguments);
  }};

  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type, attrs) {{
    const ctx = origGetContext.call(this, type, attrs);
    if (ctx && (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl')) {{
      const origGetParameter = ctx.getParameter.bind(ctx);
      ctx.getParameter = function(param) {{
        if (param === 37445) return {JsonSerializer.Serialize(wglVendor)};
        if (param === 37446) return {JsonSerializer.Serialize(wglRenderer)};
        return origGetParameter(param);
      }};
    }}
    return ctx;
  }};
}})();";

        File.WriteAllText(Path.Combine(_extDir, "inject.js"), js, Encoding.UTF8);
    }

    [STAThread]
    static void Main(string[] args)
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        string configPath = Path.Combine(AppContext.BaseDirectory, "config.json");
        string extDir;

        if (args.Length > 0)
        {
            extDir = args[0];
        }
        else if (File.Exists(configPath))
        {
            var cfg = JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(configPath));
            extDir = cfg?.GetValueOrDefault("extDir") ?? "";
        }
        else
        {
            extDir = "";
        }

        if (!Directory.Exists(extDir))
        {
            using var dlg = new FolderBrowserDialog
            {
                Description = "Select your RAC-Spoof extension folder",
                UseDescriptionForTitle = true
            };
            if (dlg.ShowDialog() != DialogResult.OK) return;
            extDir = dlg.SelectedPath;
            File.WriteAllText(configPath, JsonSerializer.Serialize(new { extDir }));
        }

        Application.Run(new RacSpooferTray(extDir));
    }
}