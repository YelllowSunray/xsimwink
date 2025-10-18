// Category definitions for performer filtering

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
}

export const CATEGORIES: Category[] = [
  {
    id: 'expression',
    name: 'Expression & Performance',
    icon: '🎭',
    description: 'Dance, poetry, music, and creative expression',
    color: 'from-pink-500 to-purple-500'
  },
  {
    id: 'connection',
    name: 'Connection & Conversation',
    icon: '💫',
    description: 'Talk to strangers, deep talks, and debates',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'mind',
    name: 'Mind & Wellbeing',
    icon: '🧘‍♀️',
    description: 'Meditation, affirmations, and mindful connection',
    color: 'from-teal-400 to-cyan-400'
  },
  {
    id: 'creativity',
    name: 'Creativity & Collaboration',
    icon: '🎨',
    description: 'Stories, ideas, and creative brainstorming',
    color: 'from-violet-500 to-purple-500'
  },
  {
    id: 'fun',
    name: 'Fun & Random',
    icon: '🎉',
    description: 'Improv, games, and playful activities',
    color: 'from-indigo-500 to-purple-500'
  },
  {
    id: 'sensual',
    name: 'Sensual',
    icon: '💞',
    description: 'Mindful emotional connection',
    color: 'from-pink-500 to-rose-500'
  }
];

// Helper function to get category by ID
export const getCategoryById = (id: string): Category | undefined => {
  return CATEGORIES.find(cat => cat.id === id);
};

// Helper function to get categories by IDs
export const getCategoriesByIds = (ids: string[]): Category[] => {
  return ids.map(id => getCategoryById(id)).filter(Boolean) as Category[];
};


