const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table for PNG chunk checksums
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, getPixel) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // Deflate
  ihdr[11] = 0; // Standard filter
  ihdr[12] = 0; // Non-interlaced

  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // Filter 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const off = 1 + x * 4;
      row[off] = r;
      row[off + 1] = g;
      row[off + 2] = b;
      row[off + 3] = a;
    }
    rawRows.push(row);
  }

  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, makeChunk('IHDR', ihdr), idat, iend]);
}

// Generates an icon matching the Sketch theme
function renderSketchChatIcon(x, y, w, h, isMaskable = false) {
  // Background: paper cream #fdfbf7
  const bg = [253, 251, 247, 255];
  // Charcoal border: #2d2d2d
  const stroke = [45, 45, 45, 255];
  // White bubble interior: #ffffff
  const bubbleFill = [255, 255, 255, 255];
  // Accent red heart / spark: #ff4d4d
  const accentRed = [255, 77, 77, 255];
  // Accent blue dot: #2d5da1
  const accentBlue = [45, 93, 161, 255];

  // If maskable, scale content inside 70% safe zone
  const scale = isMaskable ? 0.70 : 0.88;
  const cx = w / 2;
  const cy = h / 2;

  // Normalized coords relative to center (-1 to 1)
  const nx = (x - cx) / (cx * scale);
  const ny = (y - cy) / (cy * scale);

  // Rounded bubble body box: nx in [-0.75, 0.75], ny in [-0.65, 0.45]
  const bxMin = -0.75;
  const bxMax = 0.75;
  const byMin = -0.62;
  const byMax = 0.42;
  const radius = 0.28;

  // Distance to rounded rectangle
  const dx = Math.max(Math.abs(nx) - (bxMax - radius), 0);
  const dy = Math.max(Math.abs(ny - (byMin + byMax) / 2) - ((byMax - byMin) / 2 - radius), 0);
  const distBox = Math.sqrt(dx * dx + dy * dy);

  const inBubbleMain = distBox <= radius;
  const onBubbleBorder = distBox <= radius && distBox >= radius - 0.085;

  // Speech tail at bottom left: triangle between (-0.45, 0.35), (-0.1, 0.35), (-0.6, 0.78)
  const p1 = [-0.45, 0.32];
  const p2 = [-0.15, 0.32];
  const p3 = [-0.55, 0.75];

  function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
    const v0x = cx - ax, v0y = cy - ay;
    const v1x = bx - ax, v1y = by - ay;
    const v2x = px - ax, v2y = py - ay;
    const dot00 = v0x * v0x + v0y * v0y;
    const dot01 = v0x * v1x + v0y * v1y;
    const dot02 = v0x * v2x + v0y * v2y;
    const dot11 = v1x * v1x + v1y * v1y;
    const dot12 = v1x * v2x + v1y * v2y;
    const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;
    return (u >= 0) && (v >= 0) && (u + v <= 1);
  }

  const inTail = pointInTriangle(nx, ny, p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);

  // Tail edge distance check for charcoal stroke
  const edgeDistTail = (
    Math.abs((p3[1] - p1[1]) * nx - (p3[0] - p1[0]) * ny + p3[0] * p1[1] - p3[1] * p1[0]) /
    Math.hypot(p3[1] - p1[1], p3[0] - p1[0])
  );
  const onTailBorder = inTail && (edgeDistTail < 0.08 || ny > 0.68);

  // Hand-drawn offset shadow behind the bubble
  const shadowOffsetX = 0.07;
  const shadowOffsetY = 0.07;
  const snx = nx - shadowOffsetX;
  const sny = ny - shadowOffsetY;
  const sdx = Math.max(Math.abs(snx) - (bxMax - radius), 0);
  const sdy = Math.max(Math.abs(sny - (byMin + byMax) / 2) - ((byMax - byMin) / 2 - radius), 0);
  const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
  const inShadow = sDist <= radius && !inBubbleMain && !inTail;

  if (inShadow) {
    return stroke; // Charcoal shadow
  }

  // Inside the bubble:
  if (inBubbleMain || inTail) {
    if (onBubbleBorder || onTailBorder) {
      return stroke; // Charcoal outer border
    }

    // Inside decorative graphics: 3 playful hand-drawn chat dots
    // Dot 1 (Red accent #ff4d4d): center at (-0.35, -0.1)
    const d1Dist = Math.hypot(nx - (-0.35), ny - (-0.1));
    if (d1Dist <= 0.12) return accentRed;
    if (d1Dist <= 0.14) return stroke;

    // Dot 2 (Charcoal #2d2d2d): center at (0.0, -0.1)
    const d2Dist = Math.hypot(nx - 0.0, ny - (-0.1));
    if (d2Dist <= 0.12) return stroke;

    // Dot 3 (Blue accent #2d5da1): center at (0.35, -0.1)
    const d3Dist = Math.hypot(nx - 0.35, ny - (-0.1));
    if (d3Dist <= 0.12) return accentBlue;
    if (d3Dist <= 0.14) return stroke;

    return bubbleFill; // Crisp bubble interior
  }

  // Fallback to warm cream background
  return bg;
}

// Generate SVG representation for modern vector favicons
function createSvgIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <rect width="512" height="512" rx="96" fill="#fdfbf7"/>
  <!-- Hard Sketch Offset Shadow -->
  <path d="M125 140 C125 105 155 85 190 85 L360 85 C395 85 425 105 425 140 L425 270 C425 305 395 325 360 325 L245 325 L160 395 L180 325 L150 325 C130 325 125 305 125 270 Z"
        fill="#2d2d2d" transform="translate(14, 14)"/>
  <!-- Main Sketch Chat Bubble -->
  <path d="M120 135 C120 100 150 80 185 80 L355 80 C390 80 420 100 420 135 L420 265 C420 300 390 320 355 320 L240 320 L155 390 L175 320 L145 320 C125 320 120 300 120 265 Z"
        fill="#ffffff" stroke="#2d2d2d" stroke-width="16" stroke-linejoin="round"/>
  <!-- Chat Dots -->
  <circle cx="205" cy="200" r="24" fill="#ff4d4d" stroke="#2d2d2d" stroke-width="6"/>
  <circle cx="270" cy="200" r="24" fill="#2d2d2d"/>
  <circle cx="335" cy="200" r="24" fill="#2d5da1" stroke="#2d2d2d" stroke-width="6"/>
</svg>`;
}

const iconsDir = path.resolve(__dirname, '../client/public/icons');
fs.mkdirSync(iconsDir, { recursive: true });

console.log('Generating PWA Icons in:', iconsDir);

// 1. 192x192 Standard
const pwa192 = createPng(192, 192, (x, y, w, h) => renderSketchChatIcon(x, y, w, h, false));
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), pwa192);
console.log('✓ Generated icon-192.png (', pwa192.length, 'bytes )');

// 2. 192x192 Maskable
const pwa192m = createPng(192, 192, (x, y, w, h) => renderSketchChatIcon(x, y, w, h, true));
fs.writeFileSync(path.join(iconsDir, 'icon-192-maskable.png'), pwa192m);
console.log('✓ Generated icon-192-maskable.png (', pwa192m.length, 'bytes )');

// 3. 512x512 Standard
const pwa512 = createPng(512, 512, (x, y, w, h) => renderSketchChatIcon(x, y, w, h, false));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), pwa512);
console.log('✓ Generated icon-512.png (', pwa512.length, 'bytes )');

// 4. 512x512 Maskable
const pwa512m = createPng(512, 512, (x, y, w, h) => renderSketchChatIcon(x, y, w, h, true));
fs.writeFileSync(path.join(iconsDir, 'icon-512-maskable.png'), pwa512m);
console.log('✓ Generated icon-512-maskable.png (', pwa512m.length, 'bytes )');

// 5. 180x180 Apple Touch Icon
const appleTouch = createPng(180, 180, (x, y, w, h) => renderSketchChatIcon(x, y, w, h, false));
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), appleTouch);
console.log('✓ Generated apple-touch-icon.png (', appleTouch.length, 'bytes )');

// 6. SVG Icons
const svg = createSvgIcon();
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svg);
fs.writeFileSync(path.resolve(__dirname, '../client/public/favicon.svg'), svg);
console.log('✓ Generated icon.svg & favicon.svg');

console.log('All PWA assets successfully created!');
