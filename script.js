(function () {
  var S = window.SITE || {};
  var adsReady = S.adsId && S.adsId.indexOf("XXXX") === -1;

  // ---- Google tag (gtag.js) ----
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  if (adsReady || S.ga4Id) {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + (adsReady ? S.adsId : S.ga4Id);
    document.head.appendChild(s);
    gtag("js", new Date());
    if (adsReady) gtag("config", S.adsId);
    if (S.ga4Id) gtag("config", S.ga4Id);
  }

  // ---- Simpan gclid & UTM (dari iklan) ----
  var keys = ["gclid", "gbraid", "wbraid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  var q = new URLSearchParams(location.search), track = {};
  try { track = JSON.parse(sessionStorage.getItem("track") || "{}"); } catch (e) {}
  keys.forEach(function (k) { if (q.get(k)) track[k] = q.get(k); });
  try { sessionStorage.setItem("track", JSON.stringify(track)); } catch (e) {}

  function convert(name) {
    var label = S.conversionLabels && S.conversionLabels[name];
    if (adsReady && label && label.indexOf("XXXX") === -1) {
      gtag("event", "conversion", { send_to: S.adsId + "/" + label, transport_type: "beacon" });
    }
    gtag("event", "generate_lead", { method: name });
  }

  function waUrl(text) {
    return "https://wa.me/" + S.waNumber + "?text=" + encodeURIComponent(text);
  }

  // ---- Tombol WhatsApp ----
  document.querySelectorAll("[data-wa]").forEach(function (el) {
    var msg = el.getAttribute("data-wa") || "Halo, saya ingin tanya perjalanan bus.";
    el.href = waUrl(msg);
    el.target = "_blank";
    el.rel = "noopener";
    el.addEventListener("click", function () { convert("whatsapp"); });
  });

  // ---- Formulir ----
  var form = document.getElementById("lead-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = new FormData(form);
      var name = (f.get("nama") || "").toString().trim();
      var phone = (f.get("hp") || "").toString().trim();
      var msg = document.getElementById("form-msg");
      if (name.length < 2 || phone.replace(/\D/g, "").length < 9) {
        msg.textContent = "Isi nama dan nomor WhatsApp yang valid (minimal 9 angka).";
        return;
      }
      msg.textContent = "";
      var lead = {
        nama: name, hp: phone,
        tujuan: f.get("tujuan"), jemput: (f.get("jemput") || "").toString().trim(), pax: f.get("pax"), bulan: f.get("bulan"),
        halaman: location.href, waktu: new Date().toISOString()
      };
      Object.keys(track).forEach(function (k) { lead[k] = track[k]; });

      var text = "Halo " + S.brand + ", saya " + name + ".\n" +
        "Tujuan: " + lead.tujuan + "\nKota penjemputan: " + (lead.jemput || "-") + "\nJumlah orang: " + lead.pax + "\nBerangkat: " + lead.bulan +
        "\nNo. WA: " + phone;
      var win = window.open(waUrl(text), "_blank");

      convert("form");
      if (S.leadEndpoint) {
        try {
          fetch(S.leadEndpoint, { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(lead), keepalive: true });
        } catch (err) {}
      }
      if (!win) location.href = waUrl(text);
      msg.textContent = "Terima kasih, " + name + ". Chat WhatsApp terbuka; tim kami membalas dalam jam kerja.";
      form.reset();
    });
  }

  // ---- Filter paket ----
  var chips = document.querySelectorAll(".chip");
  chips.forEach(function (c) {
    c.addEventListener("click", function () {
      var f = c.getAttribute("data-filter");
      chips.forEach(function (x) { x.classList.toggle("on", x === c); });
      document.querySelectorAll(".pkg-row").forEach(function (r) {
        r.hidden = !(f === "all" || r.getAttribute("data-kat") === f);
      });
    });
  });

  // ---- Galeri: perbesar foto ----
  var lb = document.getElementById("lightbox");
  if (lb && lb.showModal) {
    document.querySelectorAll(".gallery figure").forEach(function (fig) {
      fig.addEventListener("click", function () {
        var im = fig.querySelector("img");
        if (!im) return;
        document.getElementById("lb-img").src = im.src;
        document.getElementById("lb-img").alt = im.alt;
        document.getElementById("lb-cap").textContent = im.alt;
        lb.showModal();
      });
    });
    lb.addEventListener("click", function (e) { if (e.target === lb) lb.close(); });
  }

  document.getElementById("year").textContent = new Date().getFullYear();
})();
