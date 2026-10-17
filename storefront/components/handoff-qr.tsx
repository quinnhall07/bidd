// The one-time handoff code as a real, scannable QR code drawn as inline SVG: byte mode, error
// correction L, versions 1-5 (the "bidd:handoff:<43 chars>" payload fits version 4). Small encoder
// so the storefront needs no QR package. Pilot: the seller confirms with the demo button.

// Data and error-correction codewords per version (ECC L, one block), alignment centers, remainder bits.
const VERSIONS = [
  { data: 19, ec: 7, align: [] as number[] },
  { data: 34, ec: 10, align: [6, 18] },
  { data: 55, ec: 15, align: [6, 22] },
  { data: 80, ec: 20, align: [6, 26] },
  { data: 108, ec: 26, align: [6, 30] },
];

function gfMul(x: number, y: number) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

function rsDivisor(degree: number) {
  const out = new Array<number>(degree).fill(0);
  out[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      out[j] = gfMul(out[j], root);
      if (j + 1 < degree) out[j] ^= out[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return out;
}

function rsRemainder(data: number[], divisor: number[]) {
  const out = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ (out.shift() as number);
    out.push(0);
    divisor.forEach((coef, i) => (out[i] ^= gfMul(coef, factor)));
  }
  return out;
}

function encode(text: string) {
  const bytes = Array.from(new TextEncoder().encode(text));
  let v = VERSIONS.findIndex((x) => x.data * 8 >= 12 + bytes.length * 8);
  if (v < 0) {
    v = VERSIONS.length - 1;
    bytes.length = VERSIONS[v].data - 2;
  }
  const { data: capacity, ec, align } = VERSIONS[v];
  const size = 17 + 4 * (v + 1);

  // Bit stream: mode 0100 (byte), 8-bit length, payload, terminator, then pad bytes.
  const bits: number[] = [];
  const put = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  put(0b0100, 4);
  put(bytes.length, 8);
  bytes.forEach((b) => put(b, 8));
  put(0, Math.min(4, capacity * 8 - bits.length));
  put(0, (8 - (bits.length % 8)) % 8);
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) codewords.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let pad = 0xec; codewords.length < capacity; pad ^= 0xec ^ 0x11) codewords.push(pad);
  const all = codewords.concat(rsRemainder(codewords, rsDivisor(ec)));

  const dark: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const fixed: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const set = (x: number, y: number, on: boolean) => {
    dark[y][x] = on;
    fixed[y][x] = true;
  };

  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  for (const [cx, cy] of [
    [3, 3],
    [size - 4, 3],
    [3, size - 4],
  ])
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const ring = Math.max(Math.abs(dx), Math.abs(dy));
        set(x, y, ring !== 2 && ring !== 4);
      }
  if (align.length) {
    const c = align[1];
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(c + dx, c + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }

  // Format information: ECC L (01) with mask 0, BCH(15,5), XOR 0x5412.
  const mask = 0;
  const fmtData = (0b01 << 3) | mask;
  let rem = fmtData;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const fmt = ((fmtData << 10) | rem) ^ 0x5412;
  const bit = (i: number) => ((fmt >>> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) set(8, i, bit(i));
  set(8, 7, bit(6));
  set(8, 8, bit(7));
  set(7, 8, bit(8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
  set(8, size - 8, true);

  // Codewords in the zigzag, two columns at a time from the bottom right, with mask 0 applied.
  let k = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++)
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
        if (fixed[y][x]) continue;
        const on = k < all.length * 8 ? ((all[k >>> 3] >>> (7 - (k & 7))) & 1) === 1 : false;
        k++;
        dark[y][x] = on !== ((x + y) % 2 === 0);
      }
  }
  return dark;
}

export function HandoffQr({ payload, className = "", dim = false }: { payload: string; className?: string; dim?: boolean }) {
  const grid = encode(payload);
  const n = grid.length;
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (grid[y][x]) d += `M${x} ${y}h1v1h-1z`;
  return (
    <svg
      viewBox={`-4 -4 ${n + 8} ${n + 8}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="One-time handoff QR code"
      className={`block bg-white transition-opacity duration-300 ${dim ? "opacity-15" : ""} ${className}`}
    >
      <rect x={-4} y={-4} width={n + 8} height={n + 8} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}

/** Module grid for tests and tooling. */
export const qrModules = encode;
