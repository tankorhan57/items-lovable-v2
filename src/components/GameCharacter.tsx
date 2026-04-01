
interface GameCharacterProps {
  state: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  size?: number;
  animate?: boolean;
}

// 14×22 pixel grid, Indiana Jones inspired palette
const C = {
  hat: '#7B4F2E',
  hatBrim: '#5C3A1A',
  hatBand: '#C4742A',
  jacket: '#C4742A',
  jacketShadow: '#8B4513',
  shirt: '#F5EDD4',
  pants: '#A0855A',
  belt: '#5C3A1A',
  boots: '#4A2E1A',
  bootHighlight: '#7B4F2E',
  skin: '#E8B88A',
  skinShadow: '#D4976A',
  eyes: '#1A1A2E',
  eyeWhite: '#F5F5F0',
  mouth: '#8B4513',
  hair: '#3D2B1F',
  sweat: '#87CEEB',
  teeth: '#F5F5F0',
  t: 'transparent',
};

type Row = (string | null)[];

// Body rows shared across all states (rows 0-6 = hat, row 7 = hair/forehead)
const hatRows: Row[] = [
  // Row 0: hat top
  [null,null,null,null,C.hat,C.hat,C.hat,C.hat,C.hat,C.hat,null,null,null,null],
  // Row 1: hat body
  [null,null,null,C.hat,C.hat,C.hat,C.hat,C.hat,C.hat,C.hat,C.hat,null,null,null],
  // Row 2: hat body
  [null,null,null,C.hat,C.hat,C.hat,C.hat,C.hat,C.hat,C.hat,C.hat,null,null,null],
  // Row 3: hat band
  [null,null,C.hatBand,C.hatBand,C.hatBand,C.hatBand,C.hatBand,C.hatBand,C.hatBand,C.hatBand,C.hatBand,C.hatBand,null,null],
  // Row 4: brim
  [null,C.hatBrim,C.hatBrim,C.hatBrim,C.hatBrim,C.hatBrim,C.hatBrim,C.hatBrim,C.hatBrim,C.hatBrim,C.hatBrim,C.hatBrim,C.hatBrim,null],
];

// Row 5: hair + forehead
const hairRow: Row = [null,null,C.hair,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,C.hair,null,null];

// Torso rows (rows 10-15)
const torsoRows: Row[] = [
  // Row 10: neck
  [null,null,null,null,null,C.skin,C.skin,C.skin,C.skin,null,null,null,null,null],
  // Row 11: shoulders + shirt
  [null,null,null,C.jacket,C.shirt,C.shirt,C.shirt,C.shirt,C.shirt,C.shirt,C.jacket,null,null,null],
  // Row 12: jacket body
  [null,null,C.jacket,C.jacket,C.jacket,C.shirt,C.shirt,C.shirt,C.shirt,C.jacket,C.jacket,C.jacket,null,null],
  // Row 13: jacket shadow
  [null,null,C.jacketShadow,C.jacket,C.jacket,C.jacket,C.jacket,C.jacket,C.jacket,C.jacket,C.jacket,C.jacketShadow,null,null],
  // Row 14: belt
  [null,null,null,C.belt,C.belt,C.belt,C.belt,C.belt,C.belt,C.belt,C.belt,null,null,null],
];

// Legs + boots rows (rows 15-21)
const legRows: Row[] = [
  // Row 15: pants
  [null,null,null,null,C.pants,C.pants,C.pants,C.pants,C.pants,C.pants,null,null,null,null],
  // Row 16: pants
  [null,null,null,null,C.pants,C.pants,null,null,C.pants,C.pants,null,null,null,null],
  // Row 17: pants lower
  [null,null,null,null,C.pants,C.pants,null,null,C.pants,C.pants,null,null,null,null],
  // Row 18: boots top
  [null,null,null,C.boots,C.boots,C.boots,null,null,C.boots,C.boots,C.boots,null,null,null],
  // Row 19: boots
  [null,null,null,C.boots,C.bootHighlight,C.boots,null,null,C.boots,C.bootHighlight,C.boots,null,null,null],
  // Row 20: boots bottom
  [null,null,C.boots,C.boots,C.boots,C.boots,null,null,C.boots,C.boots,C.boots,C.boots,null,null],
  // Row 21: sole
  [null,null,C.hatBrim,C.hatBrim,C.hatBrim,C.hatBrim,null,null,C.hatBrim,C.hatBrim,C.hatBrim,C.hatBrim,null,null],
];

// Face rows differ per state (rows 6-9: eyes row, brow row, nose, mouth)
function getFaceRows(state: number): Row[] {
  switch (state) {
    case 0: // Happy
      return [
        // Row 6: eyes - normal round
        [null,null,C.hair,C.eyeWhite,C.eyes,C.skin,C.skin,C.skin,C.skin,C.eyeWhite,C.eyes,C.hair,null,null],
        // Row 7: cheeks
        [null,null,null,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,null,null,null],
        // Row 8: nose
        [null,null,null,C.skin,C.skin,C.skin,C.skinShadow,C.skinShadow,C.skin,C.skin,C.skin,null,null,null],
        // Row 9: mouth - smile
        [null,null,null,C.skin,C.skin,C.mouth,C.mouth,C.mouth,C.mouth,C.skin,C.skin,null,null,null],
      ];
    case 1: // Surprised
      return [
        [null,null,C.hair,C.eyeWhite,C.eyes,C.skin,C.skin,C.skin,C.skin,C.eyeWhite,C.eyes,C.hair,null,null],
        [null,null,null,C.eyeWhite,C.eyes,C.skin,C.skin,C.skin,C.skin,C.eyeWhite,C.eyes,null,null,null],
        [null,null,null,C.skin,C.skin,C.skin,C.skinShadow,C.skinShadow,C.skin,C.skin,C.skin,null,null,null],
        [null,null,null,C.skin,C.skin,C.skin,C.mouth,C.mouth,C.skin,C.skin,C.skin,null,null,null],
      ];
    case 2: // Worried
      return [
        // Worried eyebrows (inner raised)
        [null,null,C.hair,C.eyes,C.eyeWhite,C.skin,C.skin,C.skin,C.skin,C.eyes,C.eyeWhite,C.hair,C.sweat,null],
        [null,null,null,C.eyeWhite,C.eyes,C.skin,C.skin,C.skin,C.skin,C.eyeWhite,C.eyes,null,null,null],
        [null,null,null,C.skin,C.skin,C.skin,C.skinShadow,C.skinShadow,C.skin,C.skin,C.skin,null,null,null],
        [null,null,null,C.skin,C.skin,C.skin,C.skin,C.mouth,C.mouth,C.skin,C.skin,null,null,null],
      ];
    case 3: // Anxious - wide eyes, open mouth
      return [
        [null,null,C.hair,C.eyeWhite,C.eyeWhite,C.skin,C.skin,C.skin,C.skin,C.eyeWhite,C.eyeWhite,C.hair,null,null],
        [null,null,null,C.eyeWhite,C.eyes,C.skin,C.skin,C.skin,C.skin,C.eyeWhite,C.eyes,null,null,null],
        [null,null,null,C.skin,C.skin,C.skin,C.skinShadow,C.skinShadow,C.skin,C.skin,C.skin,null,null,null],
        [null,null,null,C.skin,C.mouth,C.teeth,C.teeth,C.teeth,C.teeth,C.mouth,C.skin,null,null,null],
      ];
    case 4: // Scared - sweat drops, trembling
      return [
        [null,null,C.hair,C.eyeWhite,C.eyeWhite,C.skin,C.skin,C.skin,C.skin,C.eyeWhite,C.eyeWhite,C.hair,C.sweat,null],
        [null,null,null,C.eyeWhite,C.eyes,C.skin,C.skin,C.skin,C.skin,C.eyeWhite,C.eyes,null,C.sweat,null],
        [null,null,null,C.skin,C.skin,C.skin,C.skinShadow,C.skinShadow,C.skin,C.skin,C.skin,null,null,null],
        [null,null,null,C.skin,C.skin,C.mouth,C.mouth,C.mouth,C.skin,C.skin,C.skin,null,null,null],
      ];
    case 5: // Terrified - X eyes, many sweat drops
      return [
        [null,C.sweat,C.hair,C.eyes,C.skin,C.eyes,C.skin,C.skin,C.eyes,C.skin,C.eyes,C.hair,C.sweat,null],
        [null,C.sweat,null,C.skin,C.eyes,C.skin,C.skin,C.skin,C.skin,C.eyes,C.skin,null,C.sweat,null],
        [null,null,null,C.skin,C.skin,C.skin,C.skinShadow,C.skinShadow,C.skin,C.skin,C.skin,null,null,null],
        [null,null,null,C.skin,C.mouth,C.mouth,C.mouth,C.mouth,C.mouth,C.mouth,C.skin,null,null,null],
      ];
    case 6: // Defeated - closed eyes, sad
      return [
        [null,null,C.hair,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,C.skin,C.hair,null,null],
        [null,null,null,C.eyes,C.eyes,C.skin,C.skin,C.skin,C.skin,C.eyes,C.eyes,null,null,null],
        [null,null,null,C.skin,C.skin,C.skin,C.skinShadow,C.skinShadow,C.skin,C.skin,C.skin,null,null,null],
        [null,null,null,C.skin,C.skin,C.skin,C.mouth,C.skin,C.skin,C.skin,C.skin,null,null,null],
      ];
    default:
      return getFaceRows(0);
  }
}

// Arm modifications: override torso rows for certain states
function getArmRows(state: number): Row[] {
  const base = [...torsoRows.map(r => [...r])];
  if (state === 0) {
    // Right arm raised waving
    base[1][11] = C.jacket;
    base[1][12] = C.skin;
    base[0][12] = C.skin;
    base[0][13] = C.skin;
  } else if (state === 3) {
    // Both arms raised defensively
    base[0][1] = C.skin;
    base[0][12] = C.skin;
    base[1][1] = C.jacket;
    base[1][12] = C.jacket;
  } else if (state === 4) {
    // Arms slightly raised
    base[1][1] = C.skin;
    base[1][12] = C.skin;
  }
  return base;
}

export default function GameCharacter({ state, size = 3, animate = true }: GameCharacterProps) {
  const faceRows = getFaceRows(state);
  const armRows = getArmRows(state);

  const allRows: Row[] = [
    ...hatRows,      // 0-4
    hairRow,          // 5
    ...faceRows,      // 6-9
    ...armRows,       // 10-14
    ...legRows,       // 15-21
  ];

  const w = 14;
  const h = 22;
  const shakeClass = animate && (state === 4 || state === 5) 
    ? state === 5 ? 'animate-pixel-shake-fast' : 'animate-pixel-shake'
    : '';

  return (
    <div className={`relative inline-block ${shakeClass}`}>
      <svg
        width={w * size}
        height={h * size}
        viewBox={`0 0 ${w} ${h}`}
        shapeRendering="crispEdges"
      >
        {allRows.map((row, y) =>
          row.map((color, x) =>
            color ? (
              <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />
            ) : null
          )
        )}
      </svg>
      {/* Jail bars overlay for defeated state */}
      {state === 6 && (
        <svg
          className="absolute inset-0"
          width={w * size}
          height={h * size}
          viewBox={`0 0 ${w} ${h}`}
          shapeRendering="crispEdges"
        >
          {[3, 6, 9, 12].map(x => (
            <rect key={`bar-${x}`} x={x - 0.3} y={0} width={0.6} height={h} fill="#1A1A2E" opacity={0.7} />
          ))}
        </svg>
      )}
    </div>
  );
}
