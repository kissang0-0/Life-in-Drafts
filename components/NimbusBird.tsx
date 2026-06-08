import React from 'react';
import Svg, { Path, Circle, Ellipse, G } from 'react-native-svg';

type Props = {
  size?: number;
};

export default function NimbusBird({ size = 48 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Body */}
      <Ellipse cx="50" cy="58" rx="26" ry="22" fill="#5AABCC" />

      {/* Wing left */}
      <Ellipse
        cx="28"
        cy="60"
        rx="14"
        ry="9"
        fill="#7EC8E3"
        transform="rotate(-20 28 60)"
      />

      {/* Wing right */}
      <Ellipse
        cx="72"
        cy="60"
        rx="14"
        ry="9"
        fill="#7EC8E3"
        transform="rotate(20 72 60)"
      />

      {/* Head */}
      <Circle cx="50" cy="38" r="18" fill="#7EC8E3" />

      {/* Cheek blush */}
      <Ellipse cx="38" cy="42" rx="5" ry="3.5" fill="#A8DBF0" opacity="0.7" />
      <Ellipse cx="62" cy="42" rx="5" ry="3.5" fill="#A8DBF0" opacity="0.7" />

      {/* Eye left */}
      <Circle cx="43" cy="35" r="5" fill="#1A3A5C" />
      <Circle cx="44.5" cy="33.5" r="1.8" fill="white" />

      {/* Eye right */}
      <Circle cx="57" cy="35" r="5" fill="#1A3A5C" />
      <Circle cx="58.5" cy="33.5" r="1.8" fill="white" />

      {/* Beak */}
      <Path
        d="M46 43 Q50 49 54 43 Q50 41 46 43Z"
        fill="#FFE4A0"
      />

      {/* Crest / tuft on top */}
      <Path
        d="M50 20 Q48 12 44 10 Q50 16 56 10 Q52 12 50 20Z"
        fill="#5AABCC"
      />

      {/* Tail */}
      <Path
        d="M50 78 Q42 88 36 92 Q44 84 50 80 Q56 84 64 92 Q58 88 50 78Z"
        fill="#5AABCC"
      />

      {/* Feet */}
      <Path d="M42 78 Q40 84 37 85 M42 78 Q42 85 40 87 M42 78 Q44 84 43 87" stroke="#FFE4A0" strokeWidth="2" strokeLinecap="round" />
      <Path d="M58 78 Q56 84 53 85 M58 78 Q58 85 56 87 M58 78 Q60 84 59 87" stroke="#FFE4A0" strokeWidth="2" strokeLinecap="round" />

      {/* Wing shine */}
      <Ellipse cx="50" cy="56" rx="8" ry="5" fill="#A8DBF0" opacity="0.4" />
    </Svg>
  );
}
