/* PointPals ad setup (Google AdSense).
 *
 * 1. Get approved at https://adsense.google.com (needs your own domain, see README).
 * 2. Put your publisher id below, e.g. "ca-pub-1234567890123456".
 * 3. Create two display ad units in AdSense and paste their slot ids.
 * Until `client` is filled in, ads are off (placeholders show on localhost only).
 */
window.PP_ADS = {
  client: "",          // "ca-pub-XXXXXXXXXXXXXXXX"
  slots: { top: "", side: "" }  // numeric slot ids from AdSense
};

(function () {
  var cfg = window.PP_ADS;
  var isDev = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var KEY = "pp-consent";

  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  function placeholder(el, label) {
    el.classList.add("ph");
    el.textContent = label;
  }

  function loadAdsense(personalised) {
    window.adsbygoogle = window.adsbygoogle || [];
    if (!personalised) window.adsbygoogle.requestNonPersonalizedAds = 1;
    var s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(cfg.client);
    document.head.appendChild(s);
    [["adTop", cfg.slots.top, "horizontal"], ["adSide", cfg.slots.side, "rectangle"]].forEach(function (a) {
      var box = document.getElementById(a[0]);
      if (!box || !a[1]) return;
      var ins = document.createElement("ins");
      ins.className = "adsbygoogle";
      ins.style.display = "block";
      ins.setAttribute("data-ad-client", cfg.client);
      ins.setAttribute("data-ad-slot", a[1]);
      ins.setAttribute("data-ad-format", a[2]);
      ins.setAttribute("data-full-width-responsive", "true");
      box.appendChild(ins);
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
    });
  }

  function init() {
    var top = document.getElementById("adTop");
    var side = document.getElementById("adSide");
    if (!cfg.client) {
      if (isDev) { placeholder(top, "Ad slot: 728x90 (top)"); placeholder(side, "Ad slot: 300x250"); }
      return;
    }
    var c = get();
    if (c === "yes" || c === "no") { loadAdsense(c === "yes"); return; }
    var banner = document.getElementById("consent");
    banner.classList.remove("hidden");
    document.getElementById("consentYes").onclick = function () { set("yes"); banner.classList.add("hidden"); loadAdsense(true); };
    document.getElementById("consentNo").onclick = function () { set("no"); banner.classList.add("hidden"); loadAdsense(false); };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
