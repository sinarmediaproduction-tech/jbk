(function () {
  var S = window.SITE || {};
  var $ = function (id) { return document.getElementById(id); };
  var ready = S.supabaseUrl && S.supabaseKey && S.supabaseUrl.indexOf("XXXX") === -1 && S.supabaseKey.indexOf("XXXX") === -1;

  if (!ready || !window.supabase) {
    $("login").hidden = false;
    $("login-form").hidden = true;
    $("login-msg").className = "err";
    $("login-msg").textContent = !ready
      ? "Isi supabaseUrl dan supabaseKey di supabase-config.js terlebih dahulu."
      : "Gagal memuat Supabase. Periksa koneksi internet lalu muat ulang.";
    return;
  }

  var sb = window.supabase.createClient(S.supabaseUrl, S.supabaseKey);
  var items = [], editing = null;

  function rupiah(n) { return "Rp " + Number(n).toLocaleString("id-ID"); }
  function say(el, text, cls) { el.textContent = text || ""; el.className = cls || ""; }
  function uid() {
    return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2);
  }

  // ---------- Login ----------
  function show(session) {
    $("login").hidden = !!session;
    $("app").hidden = !session;
    if (session) { $("who").textContent = session.user.email; load(); }
  }
  sb.auth.getSession().then(function (r) { show(r.data.session); });
  sb.auth.onAuthStateChange(function (_e, session) { show(session); });

  $("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    say($("login-msg"), "Memeriksa...");
    sb.auth.signInWithPassword({ email: $("l-email").value.trim(), password: $("l-pass").value })
      .then(function (r) {
        if (r.error) say($("login-msg"), "Email atau password salah.", "err");
        else say($("login-msg"), "");
      });
  });
  $("logout").addEventListener("click", function () { sb.auth.signOut(); });

  // ---------- Daftar ----------
  var katNama = { ziarah: "Ziarah wali", wisata: "Wisata bus", sewa: "Sewa bus" };

  function load() {
    sb.from("paket").select("*").order("urutan", { ascending: true }).order("created_at", { ascending: false })
      .then(function (r) {
        if (r.error) { $("list").textContent = "Gagal memuat data: " + r.error.message; return; }
        items = r.data || [];
        render();
      });
  }

  function mk(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }

  function render() {
    var box = $("list");
    box.textContent = "";
    if (!items.length) { box.appendChild(mk("p", "", "Belum ada paket. Ketuk “Tambah paket” untuk mulai.")); return; }
    items.forEach(function (it) {
      var row = mk("div", "item");
      var th = mk("img", "th");
      th.alt = ""; th.loading = "lazy";
      if (it.poster_url) th.src = it.poster_url;
      row.appendChild(th);

      var info = mk("div");
      var h = mk("h3", "", it.nama);
      h.appendChild(mk("span", "badge" + (it.aktif ? "" : " off"), it.aktif ? "Tampil" : "Disembunyikan"));
      info.appendChild(h);
      info.appendChild(mk("p", "", [katNama[it.kategori] || it.kategori, it.durasi].filter(Boolean).join(", ")));
      info.appendChild(mk("p", "", it.harga != null ? rupiah(it.harga) + " " + (it.harga_ket || "") : "Harga: hubungi kami"));
      row.appendChild(info);

      var acts = mk("div", "acts");
      var b1 = mk("button", "btn ghost", "Ubah"); b1.type = "button";
      b1.onclick = function () { openEditor(it); };
      var b2 = mk("button", "btn ghost", it.aktif ? "Sembunyikan" : "Tampilkan"); b2.type = "button";
      b2.onclick = function () { toggle(it); };
      var b3 = mk("button", "btn danger", "Hapus"); b3.type = "button";
      b3.onclick = function () { remove(it); };
      acts.appendChild(b1); acts.appendChild(b2); acts.appendChild(b3);
      row.appendChild(acts);
      box.appendChild(row);
    });
  }

  function toggle(it) {
    sb.from("paket").update({ aktif: !it.aktif }).eq("id", it.id).then(function (r) {
      if (r.error) alert("Gagal: " + r.error.message); else load();
    });
  }

  function remove(it) {
    if (!confirm("Hapus paket “" + it.nama + "”? Ini tidak bisa dibatalkan.")) return;
    sb.from("paket").delete().eq("id", it.id).then(function (r) {
      if (r.error) { alert("Gagal: " + r.error.message); return; }
      if (it.poster_path) sb.storage.from("poster").remove([it.poster_path]);
      load();
    });
  }

  // ---------- Editor ----------
  function openEditor(it) {
    editing = it || null;
    $("editor-title").textContent = it ? "Ubah paket" : "Paket baru";
    $("f-nama").value = it ? it.nama : "";
    $("f-kat").value = it ? it.kategori : "ziarah";
    $("f-durasi").value = it && it.durasi || "";
    $("f-rute").value = it && it.rute || "";
    $("f-inc").value = it && it.termasuk || "";
    $("f-harga").value = it && it.harga != null ? it.harga : "";
    $("f-ket").value = it ? (it.harga_ket || "") : "per orang";
    $("f-urut").value = it ? it.urutan : 0;
    $("f-aktif").checked = it ? it.aktif : true;
    $("f-poster").value = "";
    $("f-hapusposter").checked = false;
    $("del-wrap").hidden = !(it && it.poster_url);
    var pv = $("p-prev");
    if (it && it.poster_url) { pv.src = it.poster_url; pv.hidden = false; } else { pv.hidden = true; pv.removeAttribute("src"); }
    say($("msg"), "");
    $("editor").hidden = false;
    $("editor").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function closeEditor() { $("editor").hidden = true; editing = null; }

  $("new").addEventListener("click", function () { openEditor(null); });
  $("cancel").addEventListener("click", closeEditor);

  $("f-poster").addEventListener("change", function () {
    var f = this.files[0], pv = $("p-prev");
    if (!f) return;
    pv.src = URL.createObjectURL(f);
    pv.hidden = false;
  });

  // Kecilkan gambar supaya cepat dibuka di HP pengunjung
  function shrink(file) {
    return new Promise(function (ok, no) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var r = Math.min(1, 1600 / Math.max(im.width, im.height));
        var c = document.createElement("canvas");
        c.width = Math.round(im.width * r); c.height = Math.round(im.height * r);
        var x = c.getContext("2d");
        x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
        x.drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u);
        c.toBlob(function (b) { b ? ok(b) : no(new Error("Gagal memproses gambar.")); }, "image/jpeg", 0.85);
      };
      im.onerror = function () { no(new Error("File bukan gambar yang valid.")); };
      im.src = u;
    });
  }

  $("editor").addEventListener("submit", function (e) {
    e.preventDefault();
    var nama = $("f-nama").value.trim();
    if (!nama) { say($("msg"), "Nama paket wajib diisi.", "err"); return; }
    var hargaTxt = $("f-harga").value.trim();
    var row = {
      nama: nama,
      kategori: $("f-kat").value,
      durasi: $("f-durasi").value.trim() || null,
      rute: $("f-rute").value.trim() || null,
      termasuk: $("f-inc").value.trim() || null,
      harga: hargaTxt === "" ? null : Number(hargaTxt),
      harga_ket: $("f-ket").value.trim() || null,
      urutan: parseInt($("f-urut").value, 10) || 0,
      aktif: $("f-aktif").checked
    };
    var file = $("f-poster").files[0];
    var hapus = $("f-hapusposter").checked;
    var oldPath = editing && editing.poster_path;
    var btn = $("save");
    btn.disabled = true;
    say($("msg"), file ? "Mengunggah poster..." : "Menyimpan...");

    var step = Promise.resolve();
    if (file) {
      step = shrink(file).then(function (blob) {
        var path = uid() + ".jpg";
        return sb.storage.from("poster").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" })
          .then(function (up) {
            if (up.error) throw up.error;
            row.poster_path = path;
            row.poster_url = sb.storage.from("poster").getPublicUrl(path).data.publicUrl;
          });
      });
    } else if (hapus) {
      row.poster_path = null; row.poster_url = null;
    }

    step.then(function () {
      return editing ? sb.from("paket").update(row).eq("id", editing.id) : sb.from("paket").insert(row);
    }).then(function (res) {
      if (res.error) throw res.error;
      if (oldPath && (file || hapus)) sb.storage.from("poster").remove([oldPath]);
      say($("msg"), "Tersimpan.", "ok");
      closeEditor();
      load();
    }).catch(function (err) {
      say($("msg"), "Gagal menyimpan: " + (err.message || err), "err");
    }).then(function () { btn.disabled = false; });
  });
})();
