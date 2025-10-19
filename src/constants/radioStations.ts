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
    id: 'electronic',
    name: 'EDM Hits',
    url: 'http://stream.djcmedia.com/classicedm',
    genre: 'Electronic',
    emoji: '💥',
    description: 'Top electronic & EDM tracks'
  },
  {
    id: 'lofi',
    name: 'Chill Lofi Beats',
    url: 'https://stream.zeno.fm/fhz1bm0d44zuv',
    genre: 'Lofi',
    emoji: '🎧',
    description: '24/7 study & chill beats'
  },
  {
    id: 'jazz',
    name: 'Smooth Jazz',
    url: 'http://smoothjazz.com.pl/mp3',
    genre: 'Jazz',
    emoji: '🎷',
    description: 'Classic smooth jazz'
  },
  {
    id: 'pop',
    name: 'Top 40 Hits',
    url: 'http://stream.1a-webradio.de/saw-hiphop/mp3-128',
    genre: 'Pop',
    emoji: '🎤',
    description: 'Current pop hits'
  },
  {
    id: 'hiphop',
    name: 'Hip Hop Beats',
    url: 'http://listen.181fm.com/181-beatport_128k.mp3',
    genre: 'Hip Hop',
    emoji: '🎤',
    description: 'Hip hop & rap music'
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
    id: 'classical',
    name: 'Classical Music',
    url: 'http://listen.181fm.com/181-classical_128k.mp3',
    genre: 'Classical',
    emoji: '🎻',
    description: 'Classical masterpieces'
  },
  {
    id: 'latin',
    name: 'Latin Hits',
    url: 'http://listen.181fm.com/181-salsa_128k.mp3',
    genre: 'Latin',
    emoji: '💃',
    description: 'Latin & salsa music'
  },
];

