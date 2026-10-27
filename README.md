# NAJMA — concept website

Concept site for a fictional smash-burger restaurant in Beirut. Scroll-driven image sequences and WebGL effects.

**Stack:** GSAP, Lenis, WebGL, Node build tooling

**Run:** `npm install`, `npm run build`, `npm run serve`. The raw source assets are not included, so `npm run assets` will not work without your own images.

Built by [Ali Houssein Ballout](https://asdesignlb.com/developer) (AS Design LB).

---

# NAJMA (نجمة): موقع البرغر

**نجمة = star.** اللوغو عالعلبة بالصور اللي عملتها نجمة، فالإسم لابق عالبراند وعندو معنى: «نجمة الشارع».

## شو بيصير مع الـ scroll
| الفصل | شو بتشوف | الفكرة المميزة |
|---|---|---|
| Hero | البرغر واقف، والكلمة **NAJMA** عملاقة وراه | الكلمة **ورا** البرغر (WebGL)، وفي ضو حرارة (heat haze) وشرار طالع |
| 01 The Smash | البرغر بينفجر وبيطير الفتات | الشاشة **بتهتزّ** والألوان بتنفصل (RGB split) على قد سرعة الـ scroll |
| 02 The Stack | الطبقات مفرودة مع ٨ أسماء وخطوط | الأسماء ماسكة الطبقات بالزبط، وبعدين البرغر **بيرجع يتركّب** |
| 03 The Box | العلبة بتتسكّر والنجمة بتضوي | الكاميرا بتفوت عالنجمة، و**النجمة بتصير بوابة** بتفتح المنيو الكريمي |
| 04 The Lineup | ٦ أصناف | المنيو **بيلفّ 3D** متل دولاب، وكل صنف إلو زاويتين (مرّق الماوس فوقو) |
| 05 Your Order | فاتورة | **الفاتورة بتنطبع** متل ماكينة المطعم، وكل شي بتزيدو بينطبع عليها، والطلب بيتبعت عالواتساب |

## كيف تشغّلو
```bash
npm install
npm run build
npm run serve
```
الموقع بيفتح على http://localhost:5191. وللنشر، اسحب فولدر `dist` على [app.netlify.com/drop](https://app.netlify.com/drop).

> ⚠️ هيدا الموقع **ما بيشتغل بدبل كليك** (file://) متل «أثر»، لأنو الـ WebGL بيحتاج يقرا الصور من سيرفر. استعمل `npm run serve` أو Netlify.

## الملفات
```
source-assets/          ← الصور والفيديوهات الأصلية (AI)
tools/prepare-assets.mjs← بيقطّع الفيديوهات لـ frames (WebP) وبيضغط الصور
public/seq/             ← 3 × 144 frame (smash / stack / box)
public/img/             ← صور المنيو
src/
  data.js      ← المنيو، الأسعار، أسماء الطبقات ومكانها عالصورة
  sequence.js  ← تحميل الـ frames بالترتيب (الأهم أول)
  stage.js     ← WebGL: الـ frames، الكلمة ورا البرغر، الهزّة، الشرار
  main.js      ← الـ scroll، البوابة، الدولاب، الفاتورة
```

## إذا بدّلت الفيديوهات أو الصور
1. حط الملفات الجديدة بـ `source-assets/` بنفس الأسماء
2. `npm run assets` (بيحتاج ffmpeg)
3. `npm run build`
4. إذا تغيّر شكل البرغر المفرود، عدّل مكان الأسماء (`u`, `v`) بـ `src/data.js`

## التقنيات (للتعلّم)
- **Image sequence:** الفيديو مقطّع لـ 144 صورة، والـ scroll بيختار أي صورة تنعرض. هيك الفيديو بيمشي لقدّام ولورا مع إيدك.
- **Crossfade بين فيديوهين:** الـ shader بيرسم صورتين وبيدمجهن، فما في ولا قطع بين فصل وفصل.
- **الكلمة ورا الأكل:** الشادر بيحسب وين الصورة أفتح من الخلفية (يعني في أكل)، وبيخبّي الكلمة هونيك.
- **البوابة:** `clip-path: circle()` بيكبر من مكان النجمة عالشاشة (محسوب من الـ frame).
- **الدولاب:** CSS 3D (`preserve-3d` + `rotateY` + `translateZ`).
- **الفاتورة:** ورقة طولها مربوط بالـ scroll، وطالعة من فتحة الماكينة.
