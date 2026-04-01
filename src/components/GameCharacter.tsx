
interface GameCharacterProps {
  state: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  size?: number;
  animate?: boolean;
}

// 20×30 pixel grid — charismatic Indiana Jones adventurer with cowboy boots
const C = {
  // Hat — classic Indy fedora
  hat: '#7B4F2E',
  hatDark: '#5C3A1A',
  hatBand: '#C4742A',
  hatHighlight: '#9B6B3E',
  hatRim: '#6B4020',
  // Jacket — leather adventure jacket
  jacket: '#C4742A',
  jacketDark: '#8B4513',
  jacketLight: '#D4884A',
  jacketEdge: '#A05A20',
  // Shirt
  shirt: '#F5EDD4',
  shirtShadow: '#E0D8C0',
  shirtV: '#D4C8A8',
  // Pants
  pants: '#A0855A',
  pantsDark: '#8A7048',
  pantsLight: '#B09868',
  // Belt
  belt: '#5C3A1A',
  beltBuckle: '#D4A843',
  beltBuckleShine: '#E8C060',
  // Cowboy boots
  boot: '#4A2E1A',
  bootMid: '#6B4020',
  bootShaft: '#5C3A1A',
  bootStitch: '#8B5E3C',
  bootHeel: '#3D2010',
  bootToe: '#5C3818',
  spur: '#D4A843',
  // Skin
  skin: '#E8B88A',
  skinShadow: '#D4976A',
  skinHighlight: '#F0C89A',
  // Face
  eyes: '#1A1A2E',
  eyeWhite: '#F5F5F0',
  eyeShine: '#FFFFFF',
  mouth: '#8B4513',
  mouthDark: '#6B3410',
  teeth: '#F5F5F0',
  smirk: '#A05530',
  // Hair
  hair: '#3D2B1F',
  stubble: '#6B5040',
  // Effects
  sweat: '#87CEEB',
  // Accessories
  whip: '#5C3A1A',
  whipEnd: '#4A2510',
  satchel: '#8B5E3C',
  satchelDark: '#6B4528',
  satchelBuckle: '#D4A843',
  // Transparent
  t: null as string | null,
};

type Pixel = string | null;
type Row = Pixel[];

const _ = C.t;

// ── HAT (rows 0-6) — tall cowboy hat with upturned brim ──
const hatRows: Row[] = [
  // Row 0: tall crown tip (narrower)
  [_,_,_,_,_,_,_,_,C.hat,C.hat,C.hat,C.hat,_,_,_,_,_,_,_,_],
  // Row 1: crown top — pinched/creased
  [_,_,_,_,_,_,_,C.hat,C.hatHighlight,C.hat,C.hat,C.hatHighlight,C.hat,_,_,_,_,_,_,_],
  // Row 2: crown body
  [_,_,_,_,_,_,C.hat,C.hat,C.hat,C.hat,C.hat,C.hat,C.hat,C.hat,_,_,_,_,_,_],
  // Row 3: crown lower — wider
  [_,_,_,_,_,C.hat,C.hatHighlight,C.hat,C.hat,C.hat,C.hat,C.hat,C.hat,C.hatHighlight,C.hat,_,_,_,_,_],
  // Row 4: hat band with buckle
  [_,_,_,_,_,C.hatBand,C.hatBand,C.hatBand,C.hatBand,C.beltBuckle,C.hatBand,C.hatBand,C.hatBand,C.hatBand,C.hatBand,_,_,_,_,_],
  // Row 5: wide brim — upturned edges (cowboy style)
  [_,_,C.hatRim,C.hatDark,C.hatDark,C.hatDark,C.hatDark,C.hatDark,C.hatDark,C.hatDark,C.hatDark,C.hatDark,C.hatDark,C.hatDark,C.hatDark,C.hatDark,C.hatDark,C.hatRim,_,_],
  // Row 6: brim tips curled up
  [_,C.hatRim,C.hatRim,_,_,_,C.hatDark,_,_,_,_,_,_,C.hatDark,_,_,_,_,C.hatRim,C.hatRim],
];

// ── HAIR + FOREHEAD (row 7) ──
const hairRow: Row = [_,_,_,_,C.hair,C.hair,C.skinHighlight,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,C.skinHighlight,C.hair,C.hair,_,_,_,_];

// ── FACE ROWS per state (rows 8-12: forehead/brow, eyes, cheeks, nose, mouth) ──
function getFaceRows(state: number): Row[] {
  const W = C.eyeWhite, E = C.eyes, S = C.skin, H = C.skinHighlight, D = C.skinShadow, M = C.mouth, T = C.teeth, SW = C.sweat, HR = C.hair, SH = C.eyeShine, SM = C.smirk, ST = C.stubble;

  switch (state) {
    case 0: // Confident smirk — charismatic adventurer
      return [
        [_,_,_,_,HR,S,S,S,S,S,S,S,S,S,S,HR,_,_,_,_],
        [_,_,_,_,S,W,W,E,S,H,H,S,W,W,E,S,_,_,_,_],
        [_,_,_,_,S,S,SH,E,S,S,S,S,S,SH,E,S,_,_,_,_],
        [_,_,_,_,S,S,S,S,S,D,D,S,S,S,S,S,_,_,_,_],
        [_,_,_,_,S,S,SM,SM,SM,SM,SM,SM,SM,S,S,S,_,_,_,_],
      ];
    case 1: // Surprised — raised brows, O mouth
      return [
        [_,_,_,_,HR,S,S,E,S,S,S,S,E,S,S,HR,_,_,_,_],
        [_,_,_,_,S,W,W,W,E,H,H,W,W,W,E,S,_,_,_,_],
        [_,_,_,_,S,S,SH,S,E,S,S,S,SH,S,E,S,_,_,_,_],
        [_,_,_,_,S,S,S,S,S,D,D,S,S,S,S,S,_,_,_,_],
        [_,_,_,_,S,S,S,S,M,M,M,M,S,S,S,S,_,_,_,_],
      ];
    case 2: // Worried — one brow up, sweat
      return [
        [_,_,_,_,HR,E,S,S,S,S,S,S,S,E,S,HR,SW,_,_,_],
        [_,_,_,_,S,W,W,E,S,H,H,S,W,W,E,S,_,_,_,_],
        [_,_,_,_,S,S,SH,E,S,S,S,S,S,SH,E,S,_,_,_,_],
        [_,_,_,_,S,S,S,S,S,D,D,S,S,S,S,S,_,_,_,_],
        [_,_,_,_,S,S,S,S,M,M,S,S,S,S,S,S,_,_,_,_],
      ];
    case 3: // Anxious — wide eyes, teeth grimace
      return [
        [_,_,_,_,HR,E,S,S,S,S,S,S,S,E,S,HR,_,_,_,_],
        [_,_,_,_,S,W,W,W,E,H,H,W,W,W,E,S,_,_,_,_],
        [_,_,_,_,S,S,SH,S,E,S,S,S,SH,S,E,S,_,_,_,_],
        [_,_,_,_,S,S,S,S,S,D,D,S,S,S,S,S,_,_,_,_],
        [_,_,_,_,S,M,T,T,T,T,T,T,T,T,M,S,_,_,_,_],
      ];
    case 4: // Scared — wide eyes, double sweat
      return [
        [_,_,_,_,HR,E,S,S,S,S,S,S,S,E,S,HR,SW,_,_,_],
        [_,_,_,_,S,W,W,W,E,H,H,W,W,W,E,S,SW,_,_,_],
        [_,_,_,_,S,S,SH,S,E,S,S,S,SH,S,E,S,_,_,_,_],
        [_,_,_,_,S,S,S,S,S,D,D,S,S,S,S,S,_,_,_,_],
        [_,_,_,_,S,S,M,M,M,M,M,M,M,M,S,S,_,_,_,_],
      ];
    case 5: // Terrified — X eyes, lots of sweat
      return [
        [_,SW,_,_,HR,E,S,E,S,S,S,E,S,E,S,HR,SW,_,_,_],
        [_,SW,_,_,S,S,E,S,S,H,H,S,S,E,S,S,SW,_,_,_],
        [_,_,_,_,S,E,S,E,S,S,S,E,S,E,S,S,_,_,_,_],
        [_,_,_,_,S,S,S,S,S,D,D,S,S,S,S,S,_,_,_,_],
        [_,_,_,_,S,M,M,M,M,M,M,M,M,M,M,S,_,_,_,_],
      ];
    case 6: // Defeated — closed eyes, tiny sad mouth, stubble
      return [
        [_,_,_,_,HR,S,S,S,S,S,S,S,S,S,S,HR,_,_,_,_],
        [_,_,_,_,S,S,E,E,E,S,S,S,E,E,E,S,_,_,_,_],
        [_,_,_,_,S,S,S,S,S,S,S,S,S,S,S,S,_,_,_,_],
        [_,_,_,_,S,S,ST,S,ST,D,D,ST,S,ST,S,S,_,_,_,_],
        [_,_,_,_,S,S,S,S,S,M,M,S,S,S,S,S,_,_,_,_],
      ];
    default:
      return getFaceRows(0);
  }
}

// ── TORSO BASE (rows 13-18) ──
const torsoBase: Row[] = [
  // Row 13: neck + collar
  [_,_,_,_,_,_,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,_,_,_,_,_,_],
  // Row 14: shoulders + V-neck shirt
  [_,_,_,_,C.jacket,C.jacket,C.shirt,C.shirt,C.shirtV,C.shirt,C.shirt,C.shirtV,C.shirt,C.shirt,C.jacket,C.jacket,_,_,_,_],
  // Row 15: jacket body
  [_,_,_,C.jacket,C.jacket,C.jacketLight,C.shirt,C.shirtShadow,C.shirt,C.shirt,C.shirt,C.shirt,C.shirtShadow,C.shirt,C.jacketLight,C.jacket,C.jacket,_,_,_],
  // Row 16: jacket + satchel strap
  [_,_,_,C.jacketDark,C.jacket,C.jacket,C.jacket,C.satchel,C.satchelBuckle,C.jacket,C.jacket,C.jacket,C.jacket,C.jacket,C.jacket,C.jacket,C.jacketDark,_,_,_],
  // Row 17: belt + buckle
  [_,_,_,_,C.belt,C.belt,C.belt,C.belt,C.beltBuckle,C.beltBuckleShine,C.beltBuckle,C.belt,C.belt,C.belt,C.belt,C.belt,_,_,_,_],
  // Row 18: satchel at hip + jacket hem
  [_,_,_,_,_,C.jacketEdge,C.jacket,C.satchel,C.satchelDark,C.satchel,C.jacket,C.jacket,C.jacket,C.jacketEdge,_,_,_,_,_,_],
];

// ── LEGS + COWBOY BOOTS (rows 19-29) ──
const legRows: Row[] = [
  // Row 19: pants top
  [_,_,_,_,_,C.pants,C.pants,C.pants,C.pants,C.pants,C.pants,C.pants,C.pants,C.pants,C.pants,_,_,_,_,_],
  // Row 20: pants
  [_,_,_,_,_,C.pants,C.pants,C.pantsDark,C.pants,_,_,C.pants,C.pantsDark,C.pants,C.pants,_,_,_,_,_],
  // Row 21: pants lower
  [_,_,_,_,_,C.pantsLight,C.pants,C.pantsDark,C.pants,_,_,C.pants,C.pantsDark,C.pants,C.pantsLight,_,_,_,_,_],
  // Row 22: boot shaft top (tucked-in pants)
  [_,_,_,_,C.bootShaft,C.bootShaft,C.bootStitch,C.bootShaft,C.bootShaft,_,_,C.bootShaft,C.bootShaft,C.bootStitch,C.bootShaft,C.bootShaft,_,_,_,_],
  // Row 23: boot shaft with stitching
  [_,_,_,_,C.boot,C.bootStitch,C.boot,C.boot,C.boot,_,_,C.boot,C.boot,C.boot,C.bootStitch,C.boot,_,_,_,_],
  // Row 24: boot shaft lower
  [_,_,_,_,C.boot,C.boot,C.bootMid,C.boot,C.boot,_,_,C.boot,C.boot,C.bootMid,C.boot,C.boot,_,_,_,_],
  // Row 25: boot ankle + spur
  [_,_,_,C.spur,C.boot,C.boot,C.boot,C.boot,C.boot,_,_,C.boot,C.boot,C.boot,C.boot,C.boot,C.spur,_,_,_],
  // Row 26: boot foot — pointed cowboy toe
  [_,_,_,_,C.boot,C.boot,C.bootMid,C.boot,C.boot,_,_,C.boot,C.boot,C.bootMid,C.boot,C.boot,_,_,_,_],
  // Row 27: boot sole + heel
  [_,_,_,C.bootHeel,C.bootHeel,C.boot,C.boot,C.boot,C.bootToe,_,_,C.bootToe,C.boot,C.boot,C.boot,C.bootHeel,C.bootHeel,_,_,_],
  // Row 28: heel + pointed toe tip
  [_,_,_,C.bootHeel,C.bootHeel,C.bootHeel,C.boot,C.boot,C.bootToe,C.bootToe,C.bootToe,C.bootToe,C.boot,C.boot,C.bootHeel,C.bootHeel,C.bootHeel,_,_,_],
  // Row 29: ground shadow
  [_,_,_,C.bootHeel,C.bootHeel,C.bootHeel,C.bootHeel,C.bootHeel,C.bootHeel,_,_,C.bootHeel,C.bootHeel,C.bootHeel,C.bootHeel,C.bootHeel,C.bootHeel,_,_,_],
];

// Arm/torso modifications per state
function getTorsoRows(state: number): Row[] {
  const rows = torsoBase.map(r => [...r]);

  if (state === 0) {
    // Confident pose: right arm out with whip, left hand on hip
    rows[1][15] = C.skin;
    rows[1][16] = C.skin;
    rows[0][16] = C.skin;
    rows[0][17] = C.skinHighlight;
    // Whip in left hand
    rows[2][2] = C.whip;
    rows[3][1] = C.whip;
    rows[3][2] = C.whipEnd;
    rows[4][0] = C.whipEnd;
  } else if (state === 3 || state === 4) {
    // Arms out defensively
    rows[2][2] = C.skin;
    rows[2][17] = C.skin;
  } else if (state === 5) {
    // Arms up in panic
    rows[1][2] = C.skin;
    rows[1][17] = C.skin;
    rows[0][2] = C.skinHighlight;
    rows[0][17] = C.skinHighlight;
  }

  return rows;
}

const GRID_W = 20;
const GRID_H = 30;

export default function GameCharacter({ state, size = 3, animate = true }: GameCharacterProps) {
  const faceRows = getFaceRows(state);
  const bodyRows = getTorsoRows(state);

  const allRows: Row[] = [
    ...hatRows,    // 0-6
    hairRow,       // 7
    ...faceRows,   // 8-12
    ...bodyRows,   // 13-18
    ...legRows,    // 19-29
  ];

  const shakeClass =
    animate && state === 5
      ? 'animate-pixel-shake-fast'
      : animate && state === 4
        ? 'animate-pixel-shake'
        : '';

  return (
    <div className={`relative inline-block ${shakeClass}`}>
      <svg
        width={GRID_W * size}
        height={GRID_H * size}
        viewBox={`0 0 ${GRID_W} ${GRID_H}`}
        shapeRendering="crispEdges"
        style={{ imageRendering: 'pixelated' }}
      >
        {allRows.map((row, y) =>
          row.map((color, x) =>
            color ? (
              <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />
            ) : null
          )
        )}
      </svg>

      {/* Jail bars for defeated state */}
      {state === 6 && (
        <svg
          className="absolute inset-0"
          width={GRID_W * size}
          height={GRID_H * size}
          viewBox={`0 0 ${GRID_W} ${GRID_H}`}
          shapeRendering="crispEdges"
        >
          {[5, 8, 11, 14, 17].map(x => (
            <rect key={`bar-${x}`} x={x - 0.25} y={0} width={0.5} height={GRID_H} fill="#1A1A2E" opacity={0.6} />
          ))}
        </svg>
      )}
    </div>
  );
}
