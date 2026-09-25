// Builds optimized WebP copies of the original photos into site/assets/img.
// Originals in Nuotraukos/ are only read, never modified.
// Run: node _tools/build-images.js   (writes _tools/lqip.json and a before/after sheet)
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'Nuotraukos');
const OUT = path.resolve(__dirname, '..', 'site', 'assets', 'img');
const WIDTHS = [480, 800, 1200, 1600];

// wb: white-balance strength 0..1 (neutralises near-white highlights; 0 keeps warm evening light)
// contrast: blend 0..1 towards a gentle 0.5%-99.5% levels stretch
// crop: fractions of the original to keep {left, top, width, height} (removes burned-in logo stamps)
const PHOTOS = [
  { src: '30.jpg', slug: 'vakaras-veranda', wb: 0, contrast: 0.2 },
  { src: '31.jpg', slug: 'prieblanda-takas', wb: 0, contrast: 0.2 },
  { src: '32.jpg', slug: 'sodyba-saulelydis', wb: 0.3, contrast: 0.3 },
  { src: '33.jpg', slug: 'sodyba-atspindys', wb: 0.3, contrast: 0.2 },
  { src: '1.jpg', slug: 'sodyba-tvenkinys', wb: 0.4, contrast: 0.4 },
  { src: '2.jpg', slug: 'upe', wb: 0.3, contrast: 0.1 },
  { src: '18.jpg', slug: 'ceremonija', wb: 0.4, contrast: 0.3 },
  { src: '8.jpg', slug: 'sale-didele', wb: 0.6, contrast: 0.3, crop: { left: 0, top: 0, width: 0.82, height: 1 } },
  { src: '13.jpg', slug: 'sale-ilgas-stalas', wb: 0.6, contrast: 0.4 },
  { src: '35.jpg', slug: 'sale-sviesi', wb: 0.6, contrast: 0.3 },
  { src: '19.jpg', slug: 'sale-sietynai', wb: 0.5, contrast: 0.3 },
  { src: '7.jpg', slug: 'desertai', wb: 0.5, contrast: 0.3, crop: { left: 0, top: 0.13, width: 1, height: 0.87 } },
  { src: '12.jpg', slug: 'tortas', wb: 0, contrast: 0 },
  { src: '17.jpg', slug: 'dekoras', wb: 0.5, contrast: 0.3 },
  { src: '6.jpg', slug: 'pavesine', wb: 0.3, contrast: 0 },
];

async function whiteGains(img) {
  // Average of bright, low-saturation pixels = what should be neutral white/grey
  const { data } = await img.clone().resize({ width: 400 }).raw().toBuffer({ resolveWithObject: true });
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 3) {
    const R = data[i], G = data[i + 1], B = data[i + 2];
    const max = Math.max(R, G, B), min = Math.min(R, G, B);
    if (max > 170 && max < 252 && (max - min) / max < 0.12) { r += R; g += G; b += B; n++; }
  }
  if (n < 200) return [1, 1, 1];
  const avg = (r + g + b) / 3 / n;
  return [avg / (r / n), avg / (g / n), avg / (b / n)].map(x => Math.min(1.08, Math.max(0.92, x)));
}

async function levels(buf, info) {
  // Percentile-based stretch on luminance, applied equally to all channels (keeps colour)
  const hist = new Array(256).fill(0);
  for (let i = 0; i < buf.length; i += 3) hist[Math.round(0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2])]++;
  const total = buf.length / 3;
  let acc = 0, lo = 0, hi = 255;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > total * 0.005) { lo = v; break; } }
  acc = 0;
  for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > total * 0.005) { hi = v; break; } }
  return { lo: Math.min(lo, 30), hi: Math.max(hi, 225) };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const lqip = {};
  const sheet = [];
  for (const p of PHOTOS) {
    const input = fs.readFileSync(path.join(SRC, p.src));
    let img = sharp(input).rotate();
    const meta = await img.metadata();
    const W = meta.orientation >= 5 ? meta.height : meta.width;
    const H = meta.orientation >= 5 ? meta.width : meta.height;
    if (p.crop) {
      const c = p.crop;
      img = sharp(await img.toBuffer()).extract({ left: Math.round(c.left * W), top: Math.round(c.top * H), width: Math.round(c.width * W), height: Math.round(c.height * H) });
    }
    const base = await img.removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const { data, info } = base;
    const gains = p.wb ? (await whiteGains(sharp(data, { raw: info }))).map(g => 1 + (g - 1) * p.wb) : [1, 1, 1];
    const { lo, hi } = await levels(data, info);
    const k = p.contrast, out = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++) {
      const v = data[i] * gains[i % 3];
      const stretched = (v - lo) * 255 / (hi - lo);
      out[i] = Math.max(0, Math.min(255, Math.round(v * (1 - k) + stretched * k)));
    }
    const processed = sharp(out, { raw: info });
    const widths = WIDTHS.filter(w => w < info.width).concat(info.width <= 1600 ? [info.width] : []);
    const files = [];
    for (const w of [...new Set(widths)]) {
      const name = `${p.slug}-${w}.webp`;
      // Large sizes: a very light blur removes JPEG/HDR noise from the originals, ~40 % smaller files
      let pipe = processed.clone().resize({ width: w });
      if (w >= 1000) pipe = pipe.blur(0.7);
      await pipe.webp({ quality: w >= 1000 ? 64 : w >= 700 ? 68 : 72, effort: 6 }).toFile(path.join(OUT, name));
      files.push(w);
    }
    const tiny = await processed.clone().resize({ width: 24 }).webp({ quality: 40 }).toBuffer();
    lqip[p.slug] = { w: info.width, h: info.height, widths: files, lqip: 'data:image/webp;base64,' + tiny.toString('base64') };
    sheet.push({ orig: await sharp(input).rotate().resize({ width: 300, height: 300, fit: 'cover' }).toBuffer(),
      proc: await processed.clone().resize({ width: 300, height: 300, fit: 'cover' }).jpeg().toBuffer() });
    console.log(p.slug.padEnd(20), `${info.width}x${info.height}`, 'gains', gains.map(g => g.toFixed(3)).join('/'), 'widths', files.join(','));
  }
  // Open Graph image 1200x630 (JPG for widest compatibility)
  await sharp(path.join(OUT, 'sodyba-saulelydis-1536.webp')).resize(1200, 630, { fit: 'cover', position: 'centre' }).jpeg({ quality: 76, mozjpeg: true }).toFile(path.join(OUT, 'og-vila-serksne.jpg'));
  fs.writeFileSync(path.join(__dirname, 'lqip.json'), JSON.stringify(lqip, null, 1));
  // Tiny blurred previews for the "thaw" reveal: <figure class="thaw lq-SLUG">
  const css = '/* Generated by _tools/build-images.js: blurred previews for the thaw reveal */\n' +
    Object.entries(lqip).map(([slug, v]) => `.lq-${slug}{--lq:url(${v.lqip})}`).join('\n') + '\n';
  fs.writeFileSync(path.resolve(__dirname, '..', 'site', 'assets', 'css', 'lqip.css'), css);
  // Before/after sheet for review (not uploaded)
  const comp = [];
  sheet.forEach((s, i) => { comp.push({ input: s.orig, left: (i % 5) * 620, top: Math.floor(i / 5) * 310 }, { input: s.proc, left: (i % 5) * 620 + 305, top: Math.floor(i / 5) * 310 }); });
  await sharp({ create: { width: 3100, height: Math.ceil(sheet.length / 5) * 310, channels: 3, background: '#fff' } }).composite(comp).jpeg({ quality: 80 }).toFile(path.join(__dirname, 'pries-po.jpg'));
})();
