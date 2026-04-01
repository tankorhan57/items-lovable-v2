
interface GameCharacterProps {
  state: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  size?: number;
  animate?: boolean;
}

// 16×24 pixel grid — refined Indiana Jones / adventure explorer
const C = {
  hat: '#7B4F2E',
  hatDark: '#5C3A1A',
  hatBand: '#C4742A',
  hatHighlight: '#9B6B3E',
  jacket: '#C4742A',
  jacketDark: '#8B4513',
  jacketLight: '#D4884A',
  shirt: '#F5EDD4',
  shirtShadow: '#E0D8C0',
  pants: '#A0855A',
  pantsDark: '#8A7048',
  belt: '#5C3A1A',
  beltBuckle: '#D4A843',
  boots: '#4A2E1A',
  bootMid: '#7B4F2E',
  bootHighlight: '#6B4528',
  sole: '#3D2010',
  skin: '#E8B88A',
  skinShadow: '#D4976A',
  skinHighlight: '#F0C89A',
  eyes: '#1A1A2E',
  eyeWhite: '#F5F5F0',
  mouth: '#8B4513',
  mouthDark: '#6B3410',
  hair: '#3D2B1F',
  hairLight: '#4D3B2F',
  sweat: '#87CEEB',
  teeth: '#F5F5F0',
  whip: '#5C3A1A',
  satchel: '#8B5E3C',
  satchelDark: '#6B4528',
  t: null as string | null,
};

type Pixel = string | null;
type Row = Pixel[];

// ── HAT (rows 0-5) ──
const hatRows: Row[] = [
  // Row 0: hat crown tip
  [C.t,C.t,C.t,C.t,C.t,C.hat,C.hat,C.hat,C.hat,C.hat,C.hat,C.t,C.t,C.t,C.t,C.t],
  // Row 1: hat crown
  [C.t,C.t,C.t,C.t,C.hat,C.hat,C.hatHighlight,C.hat,C.hat,C.hatHighlight,C.hat,C.hat,C.t,C.t,C.t,C.t],
  // Row 2: hat body
  [C.t,C.t,C.t,C.hat,C.hat,C.hat,C.hat,C.hat,C.hat,C.hat,C.hat,C.hat,C.hat,C.t,C.t,C.t],
  // Row 3: hat band
  [C.t,C.t,C.t,C.hatBand,C.hatBand,C.hatBand,C.hatBand,C.hatBand,C.hatBand,C.hatBand,C.hatBand,C.hatBand,C.hatBand,C.t,C.t,C.t],
  // Row 4: brim left + right overhang
  [C.t,C.t,C.hatDark,C.hatDark,C.hatDark,C.hatDark,C.hatDark,C.hatDark,C.hatDark,C.hatDark,C.hatDark,C.hatDark,C.hatDark,C.hatDark,C.t,C.t],
  // Row 5: brim shadow line
  [C.t,C.t,C.t,C.hatDark,C.t,C.t,C.t,C.t,C.t,C.t,C.t,C.t,C.hatDark,C.t,C.t,C.t],
];

// ── HAIR + FOREHEAD (row 6) ──
const hairRow: Row = [C.t,C.t,C.t,C.hair,C.skinHighlight,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,C.skinHighlight,C.hair,C.t,C.t,C.t];

// ── TORSO BASE (rows 11-16) ──
const torsoBase: Row[] = [
  // Row 11: neck
  [C.t,C.t,C.t,C.t,C.t,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,C.t,C.t,C.t,C.t,C.t],
  // Row 12: collar + shoulders
  [C.t,C.t,C.t,C.jacket,C.jacket,C.shirt,C.shirt,C.shirt,C.shirt,C.shirt,C.shirt,C.jacket,C.jacket,C.t,C.t,C.t],
  // Row 13: jacket + shirt
  [C.t,C.t,C.jacket,C.jacket,C.jacketLight,C.shirt,C.shirtShadow,C.shirt,C.shirt,C.shirtShadow,C.shirt,C.jacketLight,C.jacket,C.jacket,C.t,C.t],
  // Row 14: jacket body + satchel strap
  [C.t,C.t,C.jacketDark,C.jacket,C.jacket,C.jacket,C.satchel,C.jacket,C.jacket,C.jacket,C.jacket,C.jacket,C.jacket,C.jacketDark,C.t,C.t],
  // Row 15: belt + buckle
  [C.t,C.t,C.t,C.belt,C.belt,C.belt,C.beltBuckle,C.belt,C.belt,C.beltBuckle,C.belt,C.belt,C.belt,C.t,C.t,C.t],
  // Row 16: satchel at hip
  [C.t,C.t,C.t,C.t,C.jacket,C.jacket,C.satchel,C.satchelDark,C.jacket,C.jacket,C.jacket,C.jacket,C.t,C.t,C.t,C.t],
];

// ── LEGS + BOOTS (rows 17-23) ──
const legRows: Row[] = [
  // Row 17: pants top
  [C.t,C.t,C.t,C.t,C.pants,C.pants,C.pants,C.pants,C.pants,C.pants,C.pants,C.pants,C.t,C.t,C.t,C.t],
  // Row 18: pants
  [C.t,C.t,C.t,C.t,C.pants,C.pants,C.pantsDark,C.t,C.t,C.pantsDark,C.pants,C.pants,C.t,C.t,C.t,C.t],
  // Row 19: pants lower
  [C.t,C.t,C.t,C.t,C.pants,C.pantsDark,C.pants,C.t,C.t,C.pants,C.pantsDark,C.pants,C.t,C.t,C.t,C.t],
  // Row 20: boot cuff
  [C.t,C.t,C.t,C.boots,C.boots,C.bootMid,C.boots,C.t,C.t,C.boots,C.bootMid,C.boots,C.boots,C.t,C.t,C.t],
  // Row 21: boot body
  [C.t,C.t,C.t,C.boots,C.bootHighlight,C.boots,C.boots,C.t,C.t,C.boots,C.boots,C.bootHighlight,C.boots,C.t,C.t,C.t],
  // Row 22: boot sole
  [C.t,C.t,C.sole,C.boots,C.boots,C.boots,C.boots,C.t,C.t,C.boots,C.boots,C.boots,C.boots,C.sole,C.t,C.t],
  // Row 23: ground shadow
  [C.t,C.t,C.sole,C.sole,C.sole,C.sole,C.sole,C.t,C.t,C.sole,C.sole,C.sole,C.sole,C.sole,C.t,C.t],
];

// ── FACE ROWS per state (rows 7-10: brow, eyes, nose, mouth) ──
function getFaceRows(state: number): Row[] {
  const W = C.eyeWhite, E = C.eyes, S = C.skin, H = C.skinHighlight, D = C.skinShadow, M = C.mouth, T = C.teeth, SW = C.sweat, HR = C.hair;

  switch (state) {
    case 0: // Happy — big smile, friendly eyes
      return [
        [C.t,C.t,C.t,HR,S,S,S,S,S,S,S,S,S,HR,C.t,C.t],
        [C.t,C.t,C.t,S,W,E,S,H,H,S,W,E,S,S,C.t,C.t],
        [C.t,C.t,C.t,S,S,S,S,S,D,S,S,S,S,S,C.t,C.t],
        [C.t,C.t,C.t,S,S,M,M,M,M,M,M,S,S,S,C.t,C.t],
      ];
    case 1: // Surprised — wider eyes, O mouth
      return [
        [C.t,C.t,C.t,HR,S,S,S,S,S,S,S,S,S,HR,C.t,C.t],
        [C.t,C.t,C.t,S,W,W,E,H,H,W,W,E,S,S,C.t,C.t],
        [C.t,C.t,C.t,S,S,S,S,S,D,S,S,S,S,S,C.t,C.t],
        [C.t,C.t,C.t,S,S,S,M,M,M,M,S,S,S,S,C.t,C.t],
      ];
    case 2: // Worried — angled brows, sweat drop
      return [
        [C.t,C.t,C.t,HR,E,S,S,S,S,S,S,E,S,HR,SW,C.t],
        [C.t,C.t,C.t,S,W,E,S,H,H,S,W,E,S,S,C.t,C.t],
        [C.t,C.t,C.t,S,S,S,S,S,D,S,S,S,S,S,C.t,C.t],
        [C.t,C.t,C.t,S,S,S,S,M,M,S,S,S,S,S,C.t,C.t],
      ];
    case 3: // Anxious — very wide eyes, teeth showing
      return [
        [C.t,C.t,C.t,HR,E,S,S,S,S,S,S,E,S,HR,C.t,C.t],
        [C.t,C.t,C.t,S,W,W,E,H,H,W,W,E,S,S,C.t,C.t],
        [C.t,C.t,C.t,S,S,S,S,S,D,S,S,S,S,S,C.t,C.t],
        [C.t,C.t,C.t,S,M,T,T,T,T,T,T,M,S,S,C.t,C.t],
      ];
    case 4: // Scared — wide eyes, double sweat, O mouth
      return [
        [C.t,C.t,C.t,HR,E,S,S,S,S,S,S,E,S,HR,SW,C.t],
        [C.t,C.t,C.t,S,W,W,E,H,H,W,W,E,S,S,SW,C.t],
        [C.t,C.t,C.t,S,S,S,S,S,D,S,S,S,S,S,C.t,C.t],
        [C.t,C.t,C.t,S,S,M,M,M,M,M,M,S,S,S,C.t,C.t],
      ];
    case 5: // Terrified — X eyes, 4 sweat drops, wide open mouth
      return [
        [C.t,SW,C.t,HR,E,S,E,S,S,E,S,E,S,HR,SW,C.t],
        [C.t,SW,C.t,S,S,E,S,H,H,S,E,S,S,S,SW,C.t],
        [C.t,C.t,C.t,S,S,S,S,S,D,S,S,S,S,S,C.t,C.t],
        [C.t,C.t,C.t,S,M,M,M,M,M,M,M,M,S,S,C.t,C.t],
      ];
    case 6: // Defeated — closed eyes, tiny sad mouth
      return [
        [C.t,C.t,C.t,HR,S,S,S,S,S,S,S,S,S,HR,C.t,C.t],
        [C.t,C.t,C.t,S,E,E,S,S,S,S,E,E,S,S,C.t,C.t],
        [C.t,C.t,C.t,S,S,S,S,S,D,S,S,S,S,S,C.t,C.t],
        [C.t,C.t,C.t,S,S,S,S,M,S,S,S,S,S,S,C.t,C.t],
      ];
    default:
      return getFaceRows(0);
  }
}

// Arm/torso modifications per state
function getTorsoRows(state: number): Row[] {
  const rows = torsoBase.map(r => [...r]);

  if (state === 0) {
    // Right arm raised waving + whip coil in left hand
    rows[1][12] = C.skin;
    rows[1][13] = C.skin;
    rows[0][13] = C.skin;
    rows[0][14] = C.skinHighlight;
    // Whip in left hand
    rows[2][1] = C.whip;
    rows[3][0] = C.whip;
    rows[3][1] = C.whip;
  } else if (state === 3 || state === 4) {
    // Arms slightly out defensively
    rows[2][1] = C.skin;
    rows[2][14] = C.skin;
  } else if (state === 5) {
    // Arms up in panic
    rows[1][1] = C.skin;
    rows[1][14] = C.skin;
    rows[0][1] = C.skinHighlight;
    rows[0][14] = C.skinHighlight;
  }

  return rows;
}

const W = 16;
const H = 24;

export default function GameCharacter({ state, size = 3, animate = true }: GameCharacterProps) {
  const faceRows = getFaceRows(state);
  const bodyRows = getTorsoRows(state);

  const allRows: Row[] = [
    ...hatRows,    // 0-5
    hairRow,       // 6
    ...faceRows,   // 7-10
    ...bodyRows,   // 11-16
    ...legRows,    // 17-23
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
        width={W * size}
        height={H * size}
        viewBox={`0 0 ${W} ${H}`}
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
          width={W * size}
          height={H * size}
          viewBox={`0 0 ${W} ${H}`}
          shapeRendering="crispEdges"
        >
          {[4, 7, 10, 13].map(x => (
            <rect key={`bar-${x}`} x={x - 0.25} y={0} width={0.5} height={H} fill="#1A1A2E" opacity={0.65} />
          ))}
        </svg>
      )}
    </div>
  );
}
