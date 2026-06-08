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

export const NIMBUS_CELEBRATIONS = [
  "You wrote today! That's magic.",
  "A new memory — saved forever.",
  "Habit complete! You're on a streak.",
  "That letter is safe with me.",
  "A whole new chapter begins.",
];

export const MOOD_OPTIONS = [
  { key: 'happy', label: 'Happy', icon: 'sunny-outline' as const },
  { key: 'calm', label: 'Calm', icon: 'water-outline' as const },
  { key: 'grateful', label: 'Grateful', icon: 'heart-outline' as const },
  { key: 'hopeful', label: 'Hopeful', icon: 'leaf-outline' as const },
  { key: 'excited', label: 'Excited', icon: 'flash-outline' as const },
  { key: 'tired', label: 'Tired', icon: 'moon-outline' as const },
  { key: 'melancholy', label: 'Thoughtful', icon: 'cloud-outline' as const },
  { key: 'sad', label: 'Sad', icon: 'rainy-outline' as const },
  { key: 'anxious', label: 'Anxious', icon: 'thunderstorm-outline' as const },
  { key: 'angry', label: 'Frustrated', icon: 'flame-outline' as const },
];

export type MoodKey = typeof MOOD_OPTIONS[number]['key'];
