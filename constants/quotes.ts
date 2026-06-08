export const DAILY_QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "You only live once, but if you do it right, once is enough.", author: "Mae West" },
  { text: "In the end, it's not the years in your life that count. It's the life in your years.", author: "Abraham Lincoln" },
  { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
  { text: "Write hard and clear about what hurts.", author: "Ernest Hemingway" },
  { text: "One day or day one. You decide.", author: "Unknown" },
  { text: "The only way out of the labyrinth of suffering is to forgive.", author: "John Green" },
  { text: "Almost everything will work again if you unplug it for a few minutes.", author: "Anne Lamott" },
  { text: "You are enough, a thousand times enough.", author: "Unknown" },
  { text: "She made broken look beautiful and strong look invincible.", author: "Ariana Dancu" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },
  { text: "No rain, no flowers.", author: "Unknown" },
  { text: "You are braver than you believe, stronger than you seem.", author: "A.A. Milne" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "What you get by achieving your goals is not as important as what you become.", author: "Henry David Thoreau" },
  { text: "Not all those who wander are lost.", author: "J.R.R. Tolkien" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "You were given this life because you were strong enough to live it.", author: "Unknown" },
  { text: "Stars can't shine without darkness.", author: "Unknown" },
  { text: "Inhale the future, exhale the past.", author: "Unknown" },
  { text: "Growth is painful. Change is painful. But nothing is as painful as staying stuck.", author: "Unknown" },
  { text: "The world needs who you were made to be.", author: "Unknown" },
  { text: "Your story is still being written.", author: "Unknown" },
  { text: "Sometimes the smallest step in the right direction ends up being the biggest step of your life.", author: "Unknown" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Collect moments, not things.", author: "Unknown" },
  { text: "Today is a good day to have a good day.", author: "Unknown" },
  { text: "Let your tears water the seeds of your future happiness.", author: "Steve Maraboli" },
];

export const MOOD_FLOWERS: Record<string, { emoji: string; name: string; color: string }> = {
  happy:     { emoji: '🌸', name: 'Hydrangea',     color: '#FFB7D5' },
  calm:      { emoji: '💙', name: 'Forget-Me-Not', color: '#93C5FD' },
  sad:       { emoji: '🔵', name: 'Bluebell',      color: '#818CF8' },
  anxious:   { emoji: '🌧️', name: 'Rain Lily',     color: '#A5B4FC' },
  excited:   { emoji: '🌻', name: 'Sunflower',     color: '#FDE68A' },
  grateful:  { emoji: '🌷', name: 'Tulip',         color: '#F9A8D4' },
  hopeful:   { emoji: '🌿', name: 'Sprout',        color: '#6EE7B7' },
  tired:     { emoji: '🌙', name: 'Moon Flower',   color: '#C4B5FD' },
  melancholy:{ emoji: '🌫️', name: 'Mist Flower',  color: '#CBD5E1' },
  angry:     { emoji: '🌹', name: 'Red Rose',      color: '#FCA5A5' },
};

export const getDailyQuote = (): { text: string; author: string } => {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
};
