# Jamshid & Dilrabo — To'y taklifnomasi

Statik (serversiz) to'y taklifnomasi sayti: UZ / RU / EN tillari, konvert ochilish animatsiyasi,
teskari sanoq, xarita, RSVP (javob Telegram orqali yuboriladi), Qur'on oyati (78:8).

## Tuzilma

```
index.html        asosiy sahifa (ma'lumotlar __DATA__ blokida)
css/style.css     dizayn
js/app.js         mantiq
js/i18n.js        interfeys tarjimalari (uz / ru / en)
img/              hero.jpg, arch.jpg, venue.jpg shu yerga qo'yiladi
fonts/, media/    shriftlar va musiqa (ixtiyoriy)
favicon.svg
```

## Ma'lumotni o'zgartirish

`index.html` ichidagi `window.__DATA__` blokini tahrirlang (sana, manzil, koordinata, kontaktlar, matnlar).
Manzil koordinatalari: `venue.lat`, `venue.lng`; Yandex havolasi: `venue.yandexUrl`.

## GitHub Pages orqali joylash

1. GitHub'da yangi repozitoriy yarating (masalan `taklifnoma`).
2. `git remote add origin https://github.com/<login>/taklifnoma.git`
3. `git push -u origin main`
4. Repozitoriy **Settings → Pages → Deploy from a branch → main / (root)**.
5. Sayt manzili chiqqach, `index.html` dagi `og:url` va `og:image` ni o'sha manzilga almashtiring.

## Mahalliy ko'rish

```
python3 -m http.server 8000
```
So'ng `http://localhost:8000` ni oching.
