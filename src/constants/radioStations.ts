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
    name: 'Chill Lofi Beats',
    url: 'https://stream.zeno.fm/fhz1bm0d44zuv',
    genre: 'Lofi',
    emoji: '🎧',
    description: '24/7 study & chill beats'
  },
  {
    id: 'electronic',
    name: 'Electronic Dance',
    url: 'https://stream.zeno.fm/f3wvbbqmdg8uv',
    genre: 'Electronic',
    emoji: '💥',
    description: 'Top electronic & EDM tracks'
  },
  {
    id: 'jazz',
    name: 'Smooth Jazz',
    url: 'https://stream.zeno.fm/0r0xa792kwzuv',
    genre: 'Jazz',
    emoji: '🎷',
    description: 'Classic smooth jazz'
  },
  {
    id: 'pop',
    name: 'Top 40 Hits',
    url: 'https://stream.zeno.fm/d1rc9z5qg18uv',
    genre: 'Pop',
    emoji: '🎤',
    description: 'Current pop hits'
  },
  {
    id: 'hiphop',
    name: 'Hip Hop Beats',
    url: 'https://stream.zeno.fm/9a1agybrgg8uv',
    genre: 'Hip Hop',
    emoji: '🎵',
    description: 'Hip hop & rap music'
  },
  {
    id: 'rock',
    name: 'Classic Rock',
    url: 'https://stream.zeno.fm/nkqd62ap5hhvv',
    genre: 'Rock',
    emoji: '🎸',
    description: 'Classic rock hits'
  },
  {
    id: 'classical',
    name: 'Classical Music',
    url: 'https://stream.zeno.fm/f3ndepithhvvv',
    genre: 'Classical',
    emoji: '🎻',
    description: 'Classical masterpieces'
  },
  {
    id: 'ambient',
    name: 'Ambient Chill',
    url: 'https://stream.zeno.fm/cpyf0cnb5hhvv',
    genre: 'Ambient',
    emoji: '☁️',
    description: 'Relaxing ambient sounds'
  },
];

