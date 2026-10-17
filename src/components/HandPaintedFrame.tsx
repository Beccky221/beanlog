/** 色线叠画的手绘框：浅色湿边、主体笔触和少量积色，不改变照片本身。 */
export function HandPaintedFrame({ photo = false }: { photo?: boolean }) {
  const outline = photo
    ? 'M16 5 C48 3 93 6 159 4 Q176 4 175 18 C177 49 174 78 176 106 Q175 120 160 119 C114 121 65 117 18 120 Q4 120 5 105 C3 80 6 46 4 20 Q3 6 16 5 Z'
    : 'M18 5 C59 3 104 6 160 4 Q177 3 176 22 C174 67 178 107 175 145 C173 180 177 216 175 239 Q177 256 160 255 C117 257 75 253 20 256 Q4 256 5 239 C3 202 6 168 4 132 C6 95 3 58 5 22 Q3 6 18 5 Z'
  const pigment = photo
    ? 'M20 5 Q68 3 104 5 M175 35 Q177 59 175 77 M163 119 Q142 120 124 119 M5 97 Q3 71 5 50'
    : 'M24 5 Q62 3 96 5 M176 29 Q174 52 176 76 M175 188 Q177 218 175 238 M150 255 Q117 257 94 255 M5 219 Q3 194 5 178 M4 107 Q6 80 4 63'
  return (
    <svg className={`bl-painted-frame${photo ? ' bl-painted-frame-photo' : ''}`} viewBox={`0 0 180 ${photo ? 124 : 260}`} preserveAspectRatio="none" fill="none" aria-hidden="true" focusable="false">
      <path d={outline} stroke="currentColor" strokeWidth="4.8" opacity=".09" vectorEffect="non-scaling-stroke" />
      <path d={outline} stroke="currentColor" strokeWidth="1.25" opacity=".44" vectorEffect="non-scaling-stroke" />
      <path d={outline} stroke="currentColor" strokeWidth="2.7" strokeDasharray=".3 2.4" opacity=".11" vectorEffect="non-scaling-stroke" />
      <path d={pigment} stroke="currentColor" strokeWidth="1.9" opacity=".25" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
