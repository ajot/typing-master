export default function PixelKeyboard() {
  const px = 4; // pixel size
  const capColor = '#555';
  const orangeKey = '#FF6B00';
  const cyanKey = '#00FFFF';
  const frameColor = '#222';

  // Each row: array of { w (width in units), color }
  const rows = [
    // Row 1: Esc + F-keys
    [
      { w: 2, c: orangeKey },
      { w: 0.5 },
      { w: 1.5, c: capColor }, { w: 1.5, c: capColor }, { w: 1.5, c: capColor }, { w: 1.5, c: capColor },
      { w: 0.5 },
      { w: 1.5, c: capColor }, { w: 1.5, c: capColor }, { w: 1.5, c: capColor }, { w: 1.5, c: capColor },
    ],
    // Row 2: Number row
    [
      { w: 1.5, c: capColor }, { w: 1.5, c: capColor }, { w: 1.5, c: capColor }, { w: 1.5, c: capColor },
      { w: 1.5, c: capColor }, { w: 1.5, c: capColor }, { w: 1.5, c: capColor }, { w: 1.5, c: capColor },
      { w: 1.5, c: capColor }, { w: 1.5, c: capColor }, { w: 1.5, c: cyanKey },
    ],
    // Row 3: QWERTY row
    [
      { w: 2, c: capColor }, { w: 1.5, c: capColor }, { w: 1.5, c: capColor }, { w: 1.5, c: capColor },
      { w: 1.5, c: capColor }, { w: 1.5, c: capColor }, { w: 1.5, c: capColor }, { w: 1.5, c: capColor },
      { w: 1.5, c: capColor }, { w: 2, c: cyanKey },
    ],
    // Row 4: Home row
    [
      { w: 2.5, c: capColor }, { w: 1.5, c: capColor }, { w: 1.5, c: capColor }, { w: 1.5, c: capColor },
      { w: 1.5, c: capColor }, { w: 1.5, c: capColor }, { w: 1.5, c: capColor }, { w: 1.5, c: capColor },
      { w: 2.5, c: orangeKey },
    ],
    // Row 5: Spacebar row
    [
      { w: 2.5, c: capColor }, { w: 1.5, c: capColor },
      { w: 8, c: orangeKey },
      { w: 1.5, c: capColor }, { w: 2.5, c: capColor },
    ],
  ];

  const totalWidth = 16.5;
  const gap = 0.3;
  const rowHeight = 1.5;
  const rowGap = 0.4;
  const totalHeight = rows.length * rowHeight + (rows.length - 1) * rowGap + 2; // +2 for padding

  const svgWidth = totalWidth * px * 4;
  const svgHeight = totalHeight * px * 4;
  const scale = px * 4;

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="w-28 h-auto"
    >
      {/* Keyboard frame */}
      <rect
        x={0} y={0}
        width={svgWidth} height={svgHeight}
        rx={scale * 0.5}
        fill={frameColor}
      />

      {rows.map((row, ri) => {
        let x = scale * 0.5; // left padding
        const y = scale * (0.75 + ri * (rowHeight + rowGap));

        return row.map((key, ki) => {
          if (!key.c) {
            // Spacer
            x += key.w * scale;
            return null;
          }
          const keyWidth = key.w * scale - gap * scale;
          const keyHeight = rowHeight * scale - gap * scale * 0.5;
          const el = (
            <g key={`${ri}-${ki}`}>
              {/* Key shadow */}
              <rect
                x={x + 1}
                y={y + 2}
                width={keyWidth}
                height={keyHeight}
                rx={2}
                fill="rgba(0,0,0,0.4)"
              />
              {/* Key cap */}
              <rect
                x={x}
                y={y}
                width={keyWidth}
                height={keyHeight}
                rx={2}
                fill={key.c}
              />
              {/* Key highlight */}
              <rect
                x={x + 1}
                y={y + 1}
                width={keyWidth - 2}
                height={keyHeight * 0.4}
                rx={1}
                fill="rgba(255,255,255,0.15)"
              />
            </g>
          );
          x += key.w * scale;
          return el;
        });
      })}
    </svg>
  );
}
