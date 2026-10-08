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

  function bindWa(el) {
    var msg = el.getAttribute("data-wa") || "Halo, saya ingin tanya perjalanan bus.";
    el.href = waUrl(msg);
    el.target = "_blank";
    el.rel = "noopener";
    el.addEventListener("click", function () { convert("whatsapp"); });
  }
  document.querySelectorAll("[data-wa]").forEach(bindWa);

  // ---- Perbesar gambar (galeri & poster) ----
  var lb = document.getElementById("lightbox");
  function openLb(src, alt) {
    if (!lb || !lb.showModal) return;
    document.getElementById("lb-img").src = src;
    document.getElementById("lb-img").alt = alt;
    document.getElementById("lb-cap").textContent = alt;
    lb.showModal();
  }
  if (lb) lb.addEventListener("click", function (e) { if (e.target === lb) lb.close(); });
  document.querySelectorAll(".gallery figure").forEach(function (fig) {
    fig.addEventListener("click", function () {
      var im = fig.querySelector("img");
      if (im) openLb(im.src, im.alt);
    });
  });

  // ---- Paket dari dashboard (Supabase) ----
  function mk(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }

  function renderPaket(list) {
    var box = document.querySelector(".pkg");
    if (!box) return;
    box.textContent = "";
    if (!list.length) {
      box.appendChild(mk("p", "", "Paket sedang disiapkan. Hubungi kami lewat WhatsApp untuk info terbaru."));
      return;
    }
    list.forEach(function (p) {
      var row = mk("div", "pkg-row" + (p.poster_url ? " has-poster" : ""));
      row.setAttribute("data-kat", p.kategori);

      if (p.poster_url) {
        var tb = mk("button", "thumb");
        tb.type = "button";
        tb.setAttribute("aria-label", "Lihat poster " + p.nama);
        var im = document.createElement("img");
        im.src = p.poster_url; im.alt = "Poster " + p.nama;
        im.width = 96; im.height = 128; im.loading = "lazy"; im.decoding = "async";
        tb.appendChild(im);
        tb.addEventListener("click", function () { openLb(p.poster_url, "Poster " + p.nama); });
        row.appendChild(tb);
      }

      var info = mk("div");
      info.appendChild(mk("h3", "", p.nama));
      if (p.durasi) info.appendChild(mk("p", "meta", p.durasi));
      if (p.rute) info.appendChild(mk("p", "", p.rute));
      if (p.termasuk) info.appendChild(mk("p", "inc", "Termasuk: " + p.termasuk));
      row.appendChild(info);

      var price = mk("div", "price");
      if (p.harga != null) {
        price.appendChild(document.createTextNode("Rp " + Number(p.harga).toLocaleString("id-ID")));
        if (p.harga_ket) price.appendChild(mk("small", "", p.harga_ket));
      } else {
        price.appendChild(document.createTextNode("Hubungi kami"));
      }
      row.appendChild(price);

      var a = mk("a", "btn", "Tanya paket ini");
      a.setAttribute("data-wa", "Halo, saya mau tanya paket " + p.nama + ".");
      bindWa(a);
      row.appendChild(a);
      box.appendChild(row);
    });
  }

  var dbReady = S.supabaseUrl && S.supabaseKey && S.supabaseUrl.indexOf("XXXX") === -1 && S.supabaseKey.indexOf("XXXX") === -1;
  if (dbReady) {
    fetch(S.supabaseUrl + "/rest/v1/paket?select=*&aktif=eq.true&order=urutan.asc,created_at.desc", {
      headers: { apikey: S.supabaseKey }
    }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(renderPaket)
      .catch(function () { /* gagal: tetap tampilkan paket contoh di HTML */ });
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
        tujuan: f.get("tujuan"), jemput: (f.get("jemput") || "").toString().trim(),
        pax: f.get("pax"), bulan: f.get("bulan"),
        halaman: location.href, waktu: new Date().toISOString()
      };
      Object.keys(track).forEach(function (k) { lead[k] = track[k]; });

      var text = "Halo " + S.brand + ", saya " + name + ".\n" +
        "Tujuan: " + lead.tujuan + "\nKota penjemputan: " + (lead.jemput || "-") + "\nJumlah orang: " + lead.pax +
        "\nBerangkat: " + lead.bulan + "\nNo. WA: " + phone;
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

  document.getElementById("year").textContent = new Date().getFullYear();
})();
