/* Vila Šerkšnė – minimalus JS: meniu, išryškėjimas, „atitirpimas“, forma. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var loadedAt = Date.now();

  /* ---------- Mobilus meniu ---------- */
  var burger = document.querySelector('[data-burger]');
  var menu = document.querySelector('[data-menu]');

  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(function () { requestAnimationFrame(function () { menu.classList.add('is-open'); }); });
    } else {
      menu.classList.remove('is-open');
      setTimeout(function () { if (burger.getAttribute('aria-expanded') === 'false') menu.hidden = true; }, reduceMotion ? 0 : 500);
    }
  }
  if (burger && menu) {
    burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') { setMenu(false); burger.focus(); }
    });
  }

  /* ---------- Antraštės būsena (be scroll klausytojo) ---------- */
  var top = document.querySelector('[data-top]');
  var hero = document.querySelector('.hero');
  if (top && hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      top.classList.toggle('is-scrolled', !entries[0].isIntersecting);
    }, { rootMargin: '-80px 0px 0px 0px' }).observe(hero.querySelector('.hero__text'));
  }

  /* ---------- Išryškėjimas ir „atitirpimas“ ---------- */
  var reveals = document.querySelectorAll('.reveal');
  var thaws = document.querySelectorAll('.thaw');

  function thaw(fig) {
    var img = fig.querySelector('img');
    if (!img || img.complete) { fig.classList.add('is-thawed'); return; }
    img.addEventListener('load', function () { fig.classList.add('is-thawed'); }, { once: true });
    img.addEventListener('error', function () { fig.classList.add('is-thawed'); }, { once: true });
  }

  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
    thaws.forEach(function (el) { el.classList.add('is-thawed'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        if (el.classList.contains('reveal')) el.classList.add('is-in');
        if (el.classList.contains('thaw')) thaw(el);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
    thaws.forEach(function (el) { if (!el.classList.contains('reveal')) io.observe(el); });
  }

  /* ---------- Forma ---------- */
  var form = document.querySelector('[data-form]');
  var status = document.querySelector('[data-status]');

  function showStatus(text, ok) {
    if (!status) return;
    status.textContent = text;
    status.className = 'form__status ' + (ok ? 'is-ok' : 'is-error');
  }

  if (form) {
    var tel = form.querySelector('#telefonas');
    var mail = form.querySelector('#el_pastas');
    var name = form.querySelector('#vardas');
    var hint = form.querySelector('#kontakto-pastaba');

    form.addEventListener('submit', function (e) {
      var errors = [];
      [name, tel, mail].forEach(function (f) { f.removeAttribute('aria-invalid'); });
      hint.classList.remove('is-error');

      if (!name.value.trim()) { name.setAttribute('aria-invalid', 'true'); errors.push(name); }
      var hasTel = tel.value.trim() !== '';
      var hasMail = mail.value.trim() !== '';
      if (!hasTel && !hasMail) {
        tel.setAttribute('aria-invalid', 'true'); mail.setAttribute('aria-invalid', 'true');
        hint.classList.add('is-error'); errors.push(tel);
      }
      if (hasTel && !/^[0-9 +()\-]{6,20}$/.test(tel.value.trim())) { tel.setAttribute('aria-invalid', 'true'); errors.push(tel); }
      if (hasMail && !mail.checkValidity()) { mail.setAttribute('aria-invalid', 'true'); errors.push(mail); }

      if (errors.length) {
        e.preventDefault();
        showStatus('Patikrinkite pažymėtus laukus.', false);
        errors[0].focus();
        return;
      }
      form.querySelector('[data-elapsed]').value = String(Date.now() - loadedAt);
      showStatus('Siunčiama…', true);
    });
  }

  // Pranešimas po send.php nukreipimo: ?uzklausa=ok|klaida
  var result = new URLSearchParams(location.search).get('uzklausa');
  if (result && status) {
    if (result === 'ok') showStatus('Ačiū! Užklausa išsiųsta – netrukus susisieksime.', true);
    else if (result === 'truksta') showStatus('Nurodykite vardą ir telefoną arba el. paštą.', false);
    else showStatus('Nepavyko išsiųsti. Paskambinkite +370 658 99738 arba rašykite info@vilaserksne.lt.', false);
    if (history.replaceState) history.replaceState(null, '', location.pathname + '#uzklausa');
  }

  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
