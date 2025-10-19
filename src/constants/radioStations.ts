export interface RadioStation {
  id: string;
  name: string;
  url: string;
  genre: string;
  emoji: string;
  description: string;
}

export const radioStations: RadioStation[] = [
  {
    id: 'lofi',
    name: 'Lofi Girl Radio',
    url: 'http://stream.zeno.fm/f3wvbbqmdg8uv',
    genre: 'Lofi',
    emoji: '🎧',
    description: '24/7 study & chill beats'
  },
  {
    id: 'jazz',
    name: 'Smooth Jazz 24/7',
    url: 'http://smoothjazz.com.pl/mp3',
    genre: 'Jazz',
    emoji: '🎷',
    description: 'Classic smooth jazz'
  },
  {
    id: 'classical',
    name: 'Classical Music',
    url: 'http://listen.181fm.com/181-classical_128k.mp3',
    genre: 'Classical',
    emoji: '🎻',
    description: 'Classical masterpieces'
  },
  {
    id: 'pop',
    name: 'Top 40 Hits',
    url: 'http://listen.181fm.com/181-star90s_128k.mp3',
    genre: 'Pop',
    emoji: '🎤',
    description: 'Current pop hits'
  },
  {
    id: 'rock',
    name: 'Classic Rock',
    url: 'http://listen.181fm.com/181-greatoldies_128k.mp3',
    genre: 'Rock',
    emoji: '🎸',
    description: 'Classic rock hits'
  },
  {
    id: 'electronic',
    name: 'Electronic Dance',
    url: 'http://listen.181fm.com/181-beat_128k.mp3',
    genre: 'Electronic',
    emoji: '💥',
    description: 'Top electronic & EDM tracks'
  },
  {
    id: 'hiphop',
    name: 'Hip Hop Beats',
    url: 'http://listen.181fm.com/181-beatport_128k.mp3',
    genre: 'Hip Hop',
    emoji: '🎵',
    description: 'Hip hop & rap music'
  },
  {
    id: 'ambient',
    name: 'Ambient Chill',
    url: 'http://listen.181fm.com/181-chill_128k.mp3',
    genre: 'Ambient',
    emoji: '☁️',
    description: 'Relaxing ambient sounds'
  },
];

