// components/session_components/backgrounds/cover.js
// Album art, loaded so that it can be photographed as well as looked at.
//
// A screensaver only ever had to *show* a cover, and a plain `new Image()`
// does that perfectly well. The share printer draws one of these screensavers
// into an export canvas — and the moment a picture arrives without CORS
// permission, the canvas it lands on stops being readable: toBlob throws, and
// the print fails with nothing on screen to explain why.
//
// So covers are asked for anonymously, which is the thing that keeps the
// pixels readable back out again. Apple's artwork host — where nearly every
// cover in a journal comes from — answers access-control-allow-origin: *.
//
// A cover pasted in by hand may sit on a host that does not, and refusing to
// display it in order to protect an export nobody has asked for yet would be
// the wrong trade. The second attempt drops the request for permission and
// the picture appears exactly as it always did; only the print is lost, and
// the printer is the one that says so.

export function loadCover(src) {
  const img = new Image();
  if (!src) return img;
  // One retry, and only one. An onerror that re-fires on its own fallback
  // spins forever against a host that is simply down.
  let retried = false;
  img.onerror = () => {
    if (retried) return;
    retried = true;
    img.removeAttribute('crossorigin');
    img.src = src;
  };
  img.crossOrigin = 'anonymous';
  img.src = src;
  return img;
}
