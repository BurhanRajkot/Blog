// Shared pixel art and shop catalogue for the runner (scene.js) and the shop (game.js).
// Sprites are strings: one character per pixel, "." is transparent.

export const PICO = {
  K: '#1d2b53', U: '#7e2553', F: '#008751', N: '#ab5236', D: '#5f574f', S: '#c2c3c7', W: '#fff1e8', R: '#ff004d',
  O: '#ffa300', Y: '#ffec27', G: '#00e436', B: '#29adff', L: '#83769c', P: '#ff77a8', E: '#ffccaa', X: '#000000',
};

// The hero: R cap, S skin, K eyes, B shirt, P trousers
export const HERO = {
  runA: ['..RRRR..', '.RRRRRRR', '..SSKS..', '..SSSS..', '.BBBBBB.', 'S.BBBB.S', '..BBBB..', '..PPPP..', '.PP..PP.', '.P....P.'],
  runB: ['..RRRR..', '.RRRRRRR', '..SSKS..', '..SSSS..', '.BBBBBB.', '.SBBBBS.', '..BBBB..', '..PPPP..', '..PP.P..', '..P..PP.'],
  jump: ['..RRRR..', '.RRRRRRR', '..SSKS..', 'S.SSSS.S', '.BBBBBB.', '..BBBB..', '..BBBB..', '..PPPP..', '.PP..PP.', 'P......P'],
  hurt: ['..RRRR..', '.RRRRRRR', '..SXSX..', '..SSSS..', 'SBBBBBBS', '..BBBB..', '..BBBB..', '..PPPP..', '.PP..PP.', '.P....P.'],
};

export const CRATE = ['NNNNNN', 'NOOOON', 'NONNON', 'NNOONN', 'NONNON', 'NOOOON', 'NNNNNN'];
export const COIN = [['.YY.', 'YOYY', 'YOYY', '.YY.'], ['.Y..', '.O..', '.Y..', '.Y..'], ['.YY.', 'YYOY', 'YYOY', '.YY.']];
export const BAT = [
  ['U......U', 'UU.UU.UU', '.UUUUUU.', '..UWWU..', '...UU...'],
  ['........', '...UU...', 'UUUUUUUU', 'U.UWWU.U', '...UU...'],
];
export const MOON = ['..WWW.', '.WWW..', 'WWW...', 'WWW...', 'WWW...', '.WWW..', '..WWW.'];
export const SUN = ['..OYYO..', '.YYYYYY.', 'OYYYYYYO', 'YYYYYYYY', 'YYYYYYYY', 'OYYYYYYO', '.YYYYYY.', '..OYYO..'];
// ? block: touch it for a random temporary power (two frames so it glints)
export const QBLOCK = [
  ['KKKKKKKK', 'KOYYYYOK', 'KYYKKYYK', 'KYYYYKYK', 'KYYYKYYK', 'KYYYYYYK', 'KOYYKYOK', 'KKKKKKKK'],
  ['KKKKKKKK', 'KOOOOOOK', 'KOOKKOOK', 'KOOOOKOK', 'KOOOKOOK', 'KOOOOOOK', 'KOOOKOOK', 'KKKKKKKK'],
];

// 3x5 pixel font for score pop-ups ("#" is ink)
export const FONT = {
  0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'],
  2: ['###', '..#', '###', '#..', '###'], 3: ['###', '..#', '.##', '..#', '###'],
  4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '###', '..#', '###'],
  6: ['###', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'],
  8: ['###', '#.#', '###', '#.#', '###'], 9: ['###', '#.#', '###', '..#', '###'],
  '+': ['...', '.#.', '###', '.#.', '...'], x: ['...', '#.#', '.#.', '#.#', '...'],
};

// Small shield shown next to the hero during a run
export const SHIELD = ['.BBBB.', 'BWWWWB', 'BWBBWB', 'BWBBWB', '.BWWB.', '..BB..'];

// Shop icons for the power-ups
export const ICON_SHIELD = ['.KKKKKKKK.', 'KBBBBBBBBK', 'KBWWBBBBBK', 'KBWBBBBBBK', 'KBBBBBBBBK', '.KBBBBBBK.', '..KBBBBK..', '...KBBK...', '....KK....'];
export const ICON_MAGNET = ['KKKK..KKKK', 'KWWK..KWWK', 'KRRK..KRRK', 'KRRK..KRRK', 'KRRK..KRRK', 'KRRKKKKRRK', '.KRRRRRRK.', '..KKKKKK..'];
export const ICON_DOUBLE = ['....KK....', '...KGGK...', '..KGGGGK..', '.KGGKKGGK.', 'KGGK..KGGK', 'KKK.KK.KKK', '...KGGK...', '..KGGGGK..', '.KGGKKGGK.', 'KGGK..KGGK', 'KKK....KKK'];

// Runner skins: colour swaps on the hero's letters
export const SKINS = {
  classic: { name: 'Classic', price: 0, map: {}, blurb: 'Red cap, blue shirt. The original.' },
  ninja: { name: 'Ninja', price: 40, map: { R: '#000000', B: '#1d2b53', P: '#000000', K: '#ff004d' }, blurb: 'Moves quietly. Still trips on crates.' },
  knight: { name: 'Knight', price: 60, map: { R: '#c2c3c7', B: '#c2c3c7', P: '#5f574f', S: '#ffccaa' }, blurb: 'Full plate, zero extra defence.' },
  slime: { name: 'Slime', price: 50, map: { R: '#00e436', S: '#00e436', B: '#008751', P: '#008751', K: '#1d2b53' }, blurb: 'Squishy hero, same jump.' },
  gold: { name: 'Golden', price: 120, map: { R: '#ffa300', B: '#ffec27', P: '#ffa300' }, blurb: 'For people with too many coins.' },
};

export const POWERS = {
  'double-jump': { name: 'Double jump', price: 75, icon: ICON_DOUBLE, blurb: 'Jump once more in mid-air.' },
  magnet: { name: 'Coin magnet', price: 60, icon: ICON_MAGNET, blurb: 'Nearby coins fly to you.' },
  shield: { name: 'Shield', price: 90, icon: ICON_SHIELD, blurb: 'Survive one crash per run.' },
};

export const PALETTES = {
  pico: { name: 'PICO-8', price: 0, blurb: 'The default 16 colours.' },
  gameboy: { name: 'Pocket green', price: 100, blurb: 'Four shades of green, like a 1989 handheld.' },
  virtual: { name: 'Red visor', price: 150, blurb: 'Red on black. Easy on nobody.' },
};

export function heroColors(skin) {
  return Object.assign({}, PICO, (SKINS[skin] || SKINS.classic).map);
}

// Draw a sprite into a 2D context at art-pixel coordinates
export function drawSprite(ctx, rows, x, y, colors = PICO) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      ctx.fillStyle = colors[ch] || PICO[ch];
      ctx.fillRect(x + c, y + r, 1, 1);
    }
  }
}
