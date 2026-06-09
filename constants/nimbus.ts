export const NIMBUS_MESSAGES = [
  "You made it through today.",
  "One page at a time.",
  "Future you will thank you.",
  "Small steps count too.",
  "Rest is productive too.",
  "Your story matters.",
  "This moment is worth keeping.",
  "You are doing beautifully.",
  "Every word is a thread in your tapestry.",
  "Growth is not always loud.",
  "Be gentle with yourself today.",
  "You are your own archive.",
  "Your dreams deserve a home.",
  "Today's draft is tomorrow's chapter.",
  "Keep going, little star.",
  "Not every day needs to be remarkable.",
  "You showed up. That's everything.",
  "This feeling is temporary. Write it down.",
  "You are becoming, slowly and surely.",
  "The archive of you is beautiful.",
];

export const NIMBUS_MOOD_MESSAGES: Record<string, string[]> = {
  happy: [
    "Your joy is contagious — keep shining! ☀️",
    "Happy days are worth documenting. Write it all down.",
    "This happiness? Keep it here forever. 💛",
    "Good days are gifts. You deserve every bit of this.",
  ],
  calm: [
    "Peace looks beautiful on you. 🌊",
    "In stillness, we find ourselves.",
    "This quiet moment is yours to keep.",
    "Calm is a superpower. Cherish it.",
  ],
  sad: [
    "It's okay not to be okay. Writing helps. 💙",
    "Every rainy day passes. You're not alone.",
    "Let your feelings out here. This is a safe space.",
    "Even sad days are part of your story. I'm here.",
  ],
  anxious: [
    "Take a breath. You are safe here. 🌿",
    "One thought at a time. You've got this.",
    "Anxious minds are brave hearts working overtime.",
    "Write it out — it helps more than you think.",
  ],
  excited: [
    "Ride that wave! Write every detail! ⚡",
    "This excitement? Future you will love reading this.",
    "Big energy, big moments. Document it all! 🌟",
    "You're electric today. Capture it.",
  ],
  tired: [
    "Rest is part of the journey. Be gentle with yourself. 🌙",
    "Even tired days are worth remembering.",
    "You showed up today. That's truly enough. 💤",
    "Your body is asking for care. Listen to it.",
  ],
  grateful: [
    "Gratitude grows when we write it down. 🌷",
    "Your thankful heart is a gift to future you.",
    "Count the good things — they're worth keeping. ✨",
    "A grateful heart is a magnet for more good.",
  ],
  hopeful: [
    "Hope is a superpower. Write your dreams here. 🌱",
    "This feeling of possibility? Capture it.",
    "The future is bright, and you're walking toward it. 🌅",
    "Keep that hope alive — it's your compass.",
  ],
  melancholy: [
    "Bittersweet moments make the richest stories. 🌫️",
    "Thoughtful days deserve thoughtful words.",
    "There's beauty in the in-between. Write through it.",
    "Your depth is a gift. Honour it.",
  ],
  angry: [
    "Let it out here. This page can take it. 🔥",
    "Your feelings are valid. All of them.",
    "Write the fire. Then breathe. 🌹",
    "It's okay to be frustrated. Feel it, then release it.",
  ],
};

export const NIMBUS_CELEBRATIONS = [
  "You wrote today! That's magic. ✨",
  "A new memory — saved forever. 💙",
  "Habit complete! You're on a streak! 🔥",
  "That letter is safe with me. 🌸",
  "A whole new chapter begins. 📖",
  "Entry saved! Your archive grows. 🌟",
];

export const MOOD_OPTIONS = [
  { key: 'happy',      label: 'Happy',      emoji: '😀', icon: 'sunny-outline'        as const },
  { key: 'calm',       label: 'Calm',        emoji: '😌', icon: 'water-outline'        as const },
  { key: 'grateful',   label: 'Grateful',    emoji: '🥹', icon: 'heart-outline'        as const },
  { key: 'hopeful',    label: 'Hopeful',     emoji: '🌱', icon: 'leaf-outline'         as const },
  { key: 'excited',    label: 'Excited',     emoji: '🤩', icon: 'flash-outline'        as const },
  { key: 'tired',      label: 'Tired',       emoji: '😴', icon: 'moon-outline'         as const },
  { key: 'melancholy', label: 'Thoughtful',  emoji: '🤔', icon: 'cloud-outline'        as const },
  { key: 'sad',        label: 'Sad',         emoji: '😔', icon: 'rainy-outline'        as const },
  { key: 'anxious',    label: 'Anxious',     emoji: '😰', icon: 'thunderstorm-outline' as const },
  { key: 'angry',      label: 'Frustrated',  emoji: '😡', icon: 'flame-outline'        as const },
  { key: 'neutral',    label: 'Neutral',     emoji: '😶', icon: 'remove-outline'       as const },
];

export const ENTRY_TYPES = [
  { key: 'normal',      label: 'Normal',          emoji: '📖' },
  { key: 'memory',      label: 'Memory',           emoji: '🌟' },
  { key: 'travel',      label: 'Travel',           emoji: '✈️' },
  { key: 'achievement', label: 'Achievement',      emoji: '🏆' },
  { key: 'midnight',    label: 'Midnight Thoughts',emoji: '🌙' },
];

export type MoodKey = typeof MOOD_OPTIONS[number]['key'];
