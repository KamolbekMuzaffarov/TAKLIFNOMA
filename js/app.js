/* ══════════════════════════════════════════════════
   To'y taklifnomasi — frontend mantiq
   Server bilan ham, serversiz (index.html) ham ishlaydi.
   ══════════════════════════════════════════════════ */
(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const OFFLINE = location.protocol === 'file:';

  let DATA = null;
  let LANG = 'uz';
  let target = null;          // to'y sanasi (Date)
  let hasServer = false;      // API mavjudmi

  const t = (key) => (window.I18N[LANG] && window.I18N[LANG][key]) ?? window.I18N.uz[key] ?? '';
  const pick = (obj) => (obj && (obj[LANG] || obj.uz || obj.ru || obj.en)) || '';

  /* ───────────── Sana va telefon formatlash ───────────── */
  function fmtDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return iso || '';
    return t('dateFmt')(Number(m[3]), t('months')[Number(m[2]) - 1], m[1]);
  }

  function buildTarget(ev) {
    const d = new Date(`${ev.date}T${ev.time || '19:00'}:00${ev.tzOffset || '+05:00'}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  /** +998701744802 → +998 70 174 48 02 */
  function fmtPhone(raw) {
    const d = String(raw || '').replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('998')) {
      return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`;
    }
    return String(raw || '');
  }
  const digits = (raw) => String(raw || '').replace(/\D/g, '');

  /* ═══════════ RENDER ═══════════ */
  function render() {
    const d = DATA;
    document.documentElement.lang = LANG;
    document.documentElement.dataset.lang = LANG;

    // Statik interfeys matnlari
    $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    const nameInput = $('input[name=name]');
    if (nameInput) nameInput.placeholder = t('rsvp.namePh');
    const msgInput = $('textarea[name=message]');
    if (msgInput) msgInput.placeholder = t('rsvp.messagePh');

    const groom = pick(d.couple.groom);
    const bride = pick(d.couple.bride);
    const pair  = `${groom} & ${bride}`;
    const dateStr = fmtDate(d.event.date);

    // Sarlavha va meta
    document.title = `${pair} — ${pick(d.event.title)}`;
    $('meta[property="og:title"]')?.setAttribute('content', document.title);
    $('meta[name=description]')?.setAttribute('content', `${dateStr} · ${pick(d.venue.name)}`);

    // Konvert
    $('#coverNames').textContent = pair;
    $('#coverDate').textContent = dateStr;
    $('#sealMono').textContent = d.couple.monogram || '♥';
    $('#preMono').textContent = d.couple.monogram || '♥';

    // Hero
    $('#txtHello').textContent   = pick(d.texts.hello);
    $('#txtInvited').textContent = pick(d.texts.invitedTitle);
    $('#heroGroom').textContent  = groom;
    $('#heroBride').textContent  = bride;
    $('#heroDate').textContent   = dateStr;
    $('#heroTime').textContent   = d.event.time;
    setImg('#heroImg', d.images.hero);
    setImg('#archImg', d.images.arch);
    setImg('#venueImg', d.images.venue);

    // Xat
    $('#txtLetterTitle').textContent = pick(d.texts.letterTitle);
    $('#txtLetter').innerHTML = '';
    pick(d.texts.letter).split(/\n{2,}|\n/).filter(Boolean).forEach(par => {
      const p = document.createElement('p');
      p.textContent = par.trim();
      $('#txtLetter').append(p);
    });
    $('#txtSignature').textContent = pick(d.texts.signature);
    $('#letterNames').textContent = pair;

    // Kelin-kuyov
    $('#txtEventTitle').textContent = pick(d.event.title);
    $('#cGroom').textContent = groom;
    $('#cBride').textContent = bride;
    $('#cGroomP').textContent = pick(d.couple.groomParents);
    $('#cBrideP').textContent = pick(d.couple.brideParents);

    // Bo'limlarni yoqish/o'chirish
    $('#countdown').hidden = !d.settings.showCountdown;
    $('#rsvp').hidden      = !d.rsvp.enabled;

    // Manzil
    $('#vName').textContent = pick(d.venue.name);
    $('#vAddr').textContent = pick(d.venue.address);
    $('#vNote').textContent = pick(d.venue.note);
    $('#vDate').textContent = dateStr;
    $('#vTime').textContent = d.event.time;

    const { lat, lng } = d.venue;
    $('#mapGoogle').href = d.venue.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    $('#mapYandex').href = `https://yandex.uz/maps/?rtext=~${lat},${lng}&rtt=auto`;
    const mapLang = LANG === 'uz' ? 'ru' : LANG;
    const mapSrc = `https://maps.google.com/maps?q=${lat},${lng}&z=16&hl=${mapLang}&output=embed`;
    if ($('#mapFrame').getAttribute('src') !== mapSrc) $('#mapFrame').src = mapSrc;

    // Aloqa
    renderContacts(d.contacts);

    // Yakun
    $('#txtClosing').textContent = pick(d.texts.closing);
    $('#txtClosingSub').textContent = pick(d.texts.closingSub);
    $('#outroNames').textContent = pair;
    $('#outroDate').textContent = `${dateStr} · ${d.event.time}`;

    // Tillar
    $$('#langSwitch button').forEach(b => {
      b.hidden = !d.settings.languages.includes(b.dataset.setLang);
      b.classList.toggle('is-on', b.dataset.setLang === LANG);
    });

    target = buildTarget(d.event);
    tickCountdown();
    observeReveals();
  }

  function renderContacts(c) {
    const on = DATA.settings.showContacts !== false && c && (c.phone || c.telegram || c.whatsapp);
    $('#contacts').hidden = !on;
    if (!on) return;

    const phone = $('#cPhone'), tg = $('#cTg'), wa = $('#cWa');

    phone.hidden = !c.phone;
    if (c.phone) {
      phone.href = `tel:+${digits(c.phone)}`;
      $('#cPhoneVal').textContent = fmtPhone(c.phone);
    }

    tg.hidden = !c.telegram;
    if (c.telegram) {
      const user = String(c.telegram).replace(/^@/, '').trim();
      tg.href = `https://t.me/${encodeURIComponent(user)}`;
      $('#cTgVal').textContent = '@' + user;
    }

    wa.hidden = !c.whatsapp;
    if (c.whatsapp) {
      wa.href = `https://wa.me/${digits(c.whatsapp)}`;
      $('#cWaVal').textContent = fmtPhone(c.whatsapp);
    }
  }

  function setImg(sel, src) {
    const el = $(sel);
    if (el && src && el.getAttribute('src') !== src) el.src = src;
  }

  /* ═══════════ TESKARI SANOQ ═══════════ */
  const pad = (n) => String(n).padStart(2, '0');
  const prev = {};

  function tickCountdown() {
    if (!target) return;
    const diff = target - Date.now();
    const done = diff <= 0;
    $('#countBox').hidden = done;
    $('#countDone').hidden = !done;
    if (done) return;

    const s = Math.floor(diff / 1000);
    const vals = {
      cdD: Math.floor(s / 86400),
      cdH: Math.floor(s / 3600) % 24,
      cdM: Math.floor(s / 60) % 60,
      cdS: s % 60
    };
    for (const [id, v] of Object.entries(vals)) {
      const el = document.getElementById(id);
      const str = id === 'cdD' ? String(v) : pad(v);
      if (el && prev[id] !== str) {
        el.textContent = str;
        prev[id] = str;
        if (!REDUCED) {
          const cell = el.parentElement;
          cell.classList.remove('tick');
          void cell.offsetWidth;
          cell.classList.add('tick');
        }
      }
    }
  }
  setInterval(tickCountdown, 1000);

  /* ═══════════ SCROLL EFFEKTLARI ═══════════ */
  let io = null;
  function observeReveals() {
    io?.disconnect();
    io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(el => io.observe(el));
  }

  function onScroll() {
    const h = document.documentElement;
    const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
    $('#progress span').style.width = `${p * 100}%`;
  }
  addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });

  /* ═══════════ GUL BARGLARI (CANVAS) ═══════════ */
  function initPetals() {
    const cv = $('#petals');
    if (REDUCED || !DATA.settings.petals) { cv.style.display = 'none'; return; }
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, dpr = 1, items = [], raf = 0;
    const COLORS = ['rgba(228,207,198,', 'rgba(228,210,168,', 'rgba(245,235,220,', 'rgba(214,183,150,'];

    function seed() {
      const size = (5 + Math.random() * 9) * dpr;
      return {
        x: Math.random() * w, y: Math.random() * h - h,
        s: size, a: Math.random() * Math.PI * 2,
        va: (Math.random() - 0.5) * 0.02,
        vy: (0.25 + Math.random() * 0.55) * dpr,
        sway: 0.5 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2,
        o: 0.25 + Math.random() * 0.45,
        c: COLORS[(Math.random() * COLORS.length) | 0]
      };
    }
    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = cv.width = innerWidth * dpr;
      h = cv.height = innerHeight * dpr;
      cv.style.width = innerWidth + 'px';
      cv.style.height = innerHeight + 'px';
      items = Array.from({ length: innerWidth < 640 ? 16 : 30 }, seed);
    }
    function draw(ts) {
      ctx.clearRect(0, 0, w, h);
      for (const p of items) {
        p.y += p.vy;
        p.a += p.va;
        p.x += Math.sin(ts / 1400 + p.phase) * p.sway * dpr * 0.35;
        if (p.y > h + 40) Object.assign(p, seed(), { y: -30, x: Math.random() * w });

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.beginPath();
        ctx.moveTo(0, -p.s / 2);
        ctx.bezierCurveTo(p.s * 0.6, -p.s * 0.3, p.s * 0.5, p.s * 0.45, 0, p.s / 2);
        ctx.bezierCurveTo(-p.s * 0.5, p.s * 0.45, -p.s * 0.6, -p.s * 0.3, 0, -p.s / 2);
        ctx.fillStyle = p.c + p.o + ')';
        ctx.fill();
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    }
    resize();
    addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(draw);
    });
    raf = requestAnimationFrame(draw);
  }

  /* ═══════════ MUSIQA ═══════════ */
  function initMusic() {
    const audio = $('#bgm'), btn = $('#musicBtn');
    if (!DATA.music.enabled || !DATA.music.url) { btn.hidden = true; return; }
    audio.src = DATA.music.url;
    audio.volume = 0;
    btn.hidden = false;

    let fade = null;
    const fadeTo = (to, ms = 1200) => {
      clearInterval(fade);
      const from = audio.volume, steps = 30;
      let i = 0;
      fade = setInterval(() => {
        i++;
        audio.volume = Math.max(0, Math.min(1, from + (to - from) * (i / steps)));
        if (i >= steps) clearInterval(fade);
      }, ms / steps);
    };

    window.playMusic = () => {
      audio.play().then(() => { btn.classList.add('is-playing'); fadeTo(0.45); }).catch(() => {});
    };
    btn.addEventListener('click', () => {
      if (audio.paused) window.playMusic();
      else { fadeTo(0, 400); setTimeout(() => audio.pause(), 420); btn.classList.remove('is-playing'); }
    });
  }

  /* ═══════════ KONVERT OCHILISHI ═══════════ */
  function initCover() {
    const cover = $('#cover');
    let opened = false;
    const open = () => {
      if (opened) return;
      opened = true;
      cover.classList.add('is-opening');
      window.playMusic?.();
      setTimeout(() => {
        cover.classList.add('is-open');
        document.body.classList.remove('is-locked');
        onScroll();
        setTimeout(() => { cover.style.display = 'none'; }, 900);
      }, REDUCED ? 0 : 950);
    };
    $('#sealBtn').addEventListener('click', open);
    $('#openBtn').addEventListener('click', open);
  }

  /* ═══════════ RSVP ═══════════ */
  function initRsvp() {
    const form = $('#rsvpForm'), msg = $('#rsvpMsg'), btn = $('#rsvpSubmit');
    const guests = $('#guestsField'), input = form.guests;

    $$('.stepper button').forEach(b => b.addEventListener('click', () => {
      input.value = Math.min(20, Math.max(1, (+input.value || 1) + Number(b.dataset.step)));
    }));
    form.addEventListener('change', (e) => {
      if (e.target.name === 'attending') guests.classList.toggle('is-hidden', e.target.value === 'no');
    });

    const showThanks = () => {
      form.hidden = true;
      $('#rsvpThanks').hidden = false;
      $('#rsvpThanks').scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.textContent = '';
      const name = form.name.value.trim();
      if (name.length < 2) { msg.textContent = t('rsvp.errName'); form.name.focus(); return; }

      const coming = form.attending.value === 'yes';
      const payload = {
        name,
        attending: form.attending.value,
        guests: Number(input.value) || 1,
        message: form.message.value.trim(),
        lang: LANG
      };

      // Server yo'q bo'lsa — javob Telegram orqali yuboriladi
      if (!hasServer) {
        const user = String(DATA.contacts?.telegram || '').replace(/^@/, '');
        const text = [
          t('rsvp.tgIntro'),
          `${t('rsvp.name')}: ${name}`,
          `${t('rsvp.attending')} ${coming ? '✅ ' + t('rsvp.yes') : '❌ ' + t('rsvp.no')}`,
          coming ? `${t('rsvp.guests')} ${payload.guests}` : '',
          payload.message ? `💬 ${payload.message}` : ''
        ].filter(Boolean).join('\n');

        if (user) {
          open(`https://t.me/${encodeURIComponent(user)}?text=${encodeURIComponent(text)}`, '_blank');
          showThanks();
        } else {
          msg.textContent = t('rsvp.errNet');
        }
        return;
      }

      btn.disabled = true;
      btn.textContent = t('rsvp.sending');
      try {
        const res = await fetch('api/rsvp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('bad');
        showThanks();
      } catch {
        msg.textContent = t('rsvp.errNet');
        btn.disabled = false;
        btn.textContent = t('rsvp.send');
      }
    });
  }

  /* ═══════════ ULASHISH ═══════════ */
  function initShare() {
    $$('[data-share]').forEach(b => b.addEventListener('click', async () => {
      const url = OFFLINE ? (DATA.siteUrl || '') : location.href;
      const text = t('share.text');
      const kind = b.dataset.share;
      if (kind === 'telegram') open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
      else if (kind === 'whatsapp') open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
      else {
        try { await navigator.clipboard.writeText(url); } catch {}
        b.classList.add('is-done');
        setTimeout(() => b.classList.remove('is-done'), 1600);
      }
    }));
  }

  /* ═══════════ TIL ALMASHTIRISH ═══════════ */
  function initLang() {
    $('#langSwitch').addEventListener('click', (e) => {
      const b = e.target.closest('[data-set-lang]');
      if (!b) return;
      LANG = b.dataset.setLang;
      try { localStorage.setItem('taklifnoma.lang', LANG); } catch {}
      document.body.style.transition = 'opacity .25s';
      document.body.style.opacity = '.35';
      setTimeout(() => { render(); document.body.style.opacity = '1'; }, 200);
    });
  }

  function chooseLang(settings) {
    const urlLang = new URLSearchParams(location.search).get('lang');
    let saved = null;
    try { saved = localStorage.getItem('taklifnoma.lang'); } catch {}
    const browser = (navigator.language || '').slice(0, 2);
    return [urlLang, saved, settings.defaultLang, browser, 'uz']
      .find(l => l && settings.languages.includes(l)) || settings.languages[0];
  }

  /* ═══════════ BOSHLASH ═══════════ */
  async function boot() {
    // 1) Serverdan olishga urinamiz, 2) bo'lmasa HTML ichidagi zaxira ma'lumot
    if (!OFFLINE) {
      try {
        const res = await fetch('api/site', { cache: 'no-store' });
        if (res.ok) { DATA = await res.json(); hasServer = true; }
      } catch { /* server yo'q — pastda zaxiradan olamiz */ }
    }
    if (!DATA) DATA = window.__DATA__;

    if (!DATA) {
      document.body.classList.remove('is-locked');
      $('#preloader').innerHTML = '<p style="font-family:var(--serif);color:#9B7B38">Ma\'lumotlarni yuklab bo\'lmadi</p>';
      return;
    }

    LANG = chooseLang(DATA.settings);
    render();
    initLang(); initCover(); initMusic(); initPetals();
    initRsvp(); initShare();
    onScroll();

    const hero = $('#heroImg');
    const done = () => setTimeout(() => $('#preloader').classList.add('is-done'), 250);
    if (hero.complete) done();
    else { hero.addEventListener('load', done); hero.addEventListener('error', done); }
    setTimeout(done, 3500);
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
