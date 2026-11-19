/* OruSchools landing page mockup: language choice, active menu item, marquees, the steps panel, a small lift on scroll, and the demo form (nothing is sent). */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- language: an explicit choice, never guessed. Hindi and Urdu are drafts until a native speaker has reviewed them. ---------- */
  var TEXT = {
    en: {
      skip: 'Skip to main content', nav_home: 'Home', nav_who: "Who it's for", nav_features: 'Features', nav_privacy: 'Privacy', nav_start: 'How it starts',
      h1: 'A calmer way to run your <span class="it">school.</span>',
      sub: "Admissions, attendance, fees, transport and messages in one system. Teachers and drivers keep working when the network doesn't.",
      cta: 'Request a demo', cta2: 'See how it starts', chat: 'Ask a question'
    },
    hi: {
      skip: 'मुख्य सामग्री पर जाएँ', nav_home: 'होम', nav_who: 'किसके लिए', nav_features: 'सुविधाएँ', nav_privacy: 'गोपनीयता', nav_start: 'शुरुआत कैसे होती है',
      h1: 'अपने <span class="it">स्कूल</span> को चलाने का एक सरल तरीका।',
      sub: 'प्रवेश, उपस्थिति, शुल्क, परिवहन और संदेश, सब एक ही प्रणाली में। नेटवर्क न हो तब भी शिक्षक और ड्राइवर काम करते रहते हैं।',
      cta: 'डेमो का अनुरोध करें', cta2: 'शुरुआत कैसे होती है, देखें', chat: 'प्रश्न पूछें'
    },
    ur: {
      skip: 'مرکزی مواد پر جائیں', nav_home: 'ہوم', nav_who: 'کس کے لیے', nav_features: 'خصوصیات', nav_privacy: 'رازداری', nav_start: 'آغاز کیسے ہوتا ہے',
      h1: 'اپنے <span class="it">اسکول</span> کو چلانے کا ایک پرسکون طریقہ۔',
      sub: 'داخلے، حاضری، فیس، ٹرانسپورٹ اور پیغامات ایک ہی نظام میں۔ نیٹ ورک نہ ہو تب بھی اساتذہ اور ڈرائیور کام جاری رکھتے ہیں۔',
      cta: 'ڈیمو کی درخواست کریں', cta2: 'آغاز کیسے ہوتا ہے، دیکھیں', chat: 'سوال پوچھیں'
    }
  };
  var DIR = { en: 'ltr', hi: 'ltr', ur: 'rtl' };
  var note = document.createElement('p');
  note.className = 'small-note';
  note.id = 'draft-note';
  note.hidden = true;
  note.setAttribute('dir', 'ltr');
  note.setAttribute('role', 'status');
  note.textContent = 'Draft translation of the top of the page, not yet reviewed by a native speaker.';

  function setLang(code) {
    var t = TEXT[code] || TEXT.en;
    var root = document.documentElement;
    root.lang = code;
    root.dir = DIR[code] || 'ltr';
    $$('[data-i18n]').forEach(function (n) { var v = t[n.getAttribute('data-i18n')]; if (v) n.textContent = v; });
    $$('[data-i18n-html]').forEach(function (n) { var v = t[n.getAttribute('data-i18n-html')]; if (v) n.innerHTML = v; });
    $$('.lang button').forEach(function (b) {
      var on = b.getAttribute('data-lang') === code;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    note.hidden = code === 'en';
    try { window.localStorage.setItem('oru-lang', code); } catch (e) { /* storage may be blocked: the page works without it */ }
  }
  var hero = $('.hero-in');
  if (hero) { var who = $('.who-row', hero); hero.insertBefore(note, who); }
  $$('.lang button').forEach(function (b) { b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); }); });
  var saved = null;
  try { saved = window.localStorage.getItem('oru-lang'); } catch (e) { saved = null; }
  if (saved && TEXT[saved] && saved !== 'en') setLang(saved);

  /* ---------- menu: mark the section on screen ---------- */
  var links = $$('.pill a');
  var map = {};
  links.forEach(function (a) { var id = (a.getAttribute('href') || '').slice(1); var s = document.getElementById(id); if (s) map[id] = { a: a, s: s }; });
  function onScroll() {
    var y = window.scrollY + 140, current = 'top';
    Object.keys(map).forEach(function (id) { if (map[id].s.offsetTop <= y) current = id; });
    links.forEach(function (a) { a.classList.toggle('on', a === (map[current] && map[current].a)); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- marquees: the track is doubled so the loop has no gap ---------- */
  $$('.track').forEach(function (tr) { tr.innerHTML += tr.innerHTML; });
  $$('.tag-track').forEach(function (tr) { tr.innerHTML += tr.innerHTML; });

  /* ---------- a small lift as sections arrive (the content is already visible without it) ---------- */
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.12 });
    $$('.rl, .card, .pr, .soon-card, .demo, .inspector').forEach(function (n) { n.classList.add('lift'); io.observe(n); });
  }

  /* ---------- how a school starts: one panel at a time, arrow keys move between steps ---------- */
  var tabs = $$('.steps [role="tab"]');
  var path = $('#ins-path');
  function pick(i, focus) {
    tabs.forEach(function (t, k) {
      var on = k === i;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      var p = document.getElementById(t.getAttribute('aria-controls'));
      if (p) p.hidden = !on;
      if (on && path) path.textContent = $('.mono', t).textContent + ' / ' + $('b', t).textContent;
    });
    if (focus) tabs[i].focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { pick(i, false); });
    t.addEventListener('keydown', function (e) {
      var n = tabs.length;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); pick((i + 1) % n, true); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); pick((i - 1 + n) % n, true); }
    });
  });

  /* ---------- demo form: checked on the page, then a thank-you. Nothing leaves the browser. ---------- */
  var form = $('#form');
  if (form) {
    var need = [['f-name', 'e-name'], ['f-school', 'e-school'], ['f-contact', 'e-contact']];
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = null;
      need.forEach(function (p) {
        var inp = document.getElementById(p[0]), err = document.getElementById(p[1]);
        var empty = !inp.value.trim();
        inp.setAttribute('aria-invalid', String(empty));
        err.hidden = !empty;
        if (empty && !bad) bad = inp;
      });
      var ok = $('#ok');
      if (bad) { ok.hidden = true; bad.focus(); return; }
      var name = document.getElementById('f-name').value.trim().split(/\s+/)[0];
      ok.textContent = 'Thank you, ' + name + '. This is a mockup, so nothing was sent. A real form would reach the OruSchools team.';
      ok.hidden = false;
      form.reset();
    });
    need.forEach(function (p) { document.getElementById(p[0]).addEventListener('input', function () { this.setAttribute('aria-invalid', 'false'); document.getElementById(p[1]).hidden = true; }); });
  }
})();
