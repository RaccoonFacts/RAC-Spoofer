(function() {
  const def = (o, k, v) => Object.defineProperty(o, k, { get: () => v, configurable: true });
  def(window,    'innerWidth',          240);
  def(window,    'innerHeight',         180);
  def(window,    'outerWidth',          240);
  def(window,    'outerHeight',         180);
  def(screen,    'width',               240);
  def(screen,    'height',              180);
  def(screen,    'availWidth',          240);
  def(screen,    'availHeight',         180);
  def(screen,    'colorDepth',          8);
  def(screen,    'pixelDepth',          8);
  def(navigator, 'userAgent',           "Mozilla/5.0 (Toaster; Bread OS 3.1) ToastKit/1.0 BreadBrowser/2024");
  def(navigator, 'platform',            "RaccoonOS");
  def(navigator, 'vendor',              "Raccoon Inc.");
  def(navigator, 'hardwareConcurrency', 1);
  def(navigator, 'deviceMemory',        0.25);

  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(type) {
    if (this.width > 16 && this.height > 16) {
      const ctx = this.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i]     = (imageData.data[i]     + 1) % 256;
          imageData.data[i + 1] = (imageData.data[i + 1] + 1) % 256;
        }
        ctx.putImageData(imageData, 0, 0);
      }
    }
    return origToDataURL.apply(this, arguments);
  };

  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type, attrs) {
    const ctx = origGetContext.call(this, type, attrs);
    if (ctx && (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl')) {
      const origGetParameter = ctx.getParameter.bind(ctx);
      ctx.getParameter = function(param) {
        if (param === 37445) return "Raccoon Inc.";
        if (param === 37446) return "ToasterGPU 1.0";
        return origGetParameter(param);
      };
    }
    return ctx;
  };
})();