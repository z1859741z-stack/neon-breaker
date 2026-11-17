// The eight levels, laid out by hand. Each row is 12 characters, one per brick column:
//   '.' empty, '1'..'5' a brick of that tier (hit points), 'A' armored (3 hits),
//   'X' unbreakable steel (the ball bounces off; it never counts toward clearing).
// The accent is the level's theme colour, used for its banner and the starfield tint.

export const LEVELS = [
  {
    name: 'First Light',
    accent: '#39d5ff',
    rows: [
      '............',
      '.1111111111.',
      '.1222222221.',
      '.1111111111.',
      '............',
    ],
  },
  {
    name: 'Checkerboard',
    accent: '#2fd67a',
    rows: [
      '121212121212',
      '212121212121',
      '121212121212',
      '212121212121',
      '............',
    ],
  },
  {
    name: 'The Pillars',
    accent: '#f2c94c',
    rows: [
      '1X11111111X1',
      '1X22222222X1',
      '1X23333332X1',
      '1X22222222X1',
      '1X11111111X1',
    ],
  },
  {
    name: 'Diamond',
    accent: '#ff8a3d',
    rows: [
      '.....33.....',
      '...333333...',
      '..34444443..',
      '.3445555543.',
      '..34444443..',
      '...333333...',
      '.....33.....',
    ],
  },
  {
    name: 'The Fortress',
    accent: '#c8d2e0',
    rows: [
      'AAAAAAAAAAAA',
      'A1111111111A',
      'A1222222221A',
      'A1233333321A',
      'A1222222221A',
      'A1111111111A',
      'AAAAAAAAAAAA',
    ],
  },
  {
    name: 'Rainbow Fall',
    accent: '#ff4d6d',
    rows: [
      '111111111111',
      '222222222222',
      '333333333333',
      '444444444444',
      '555555555555',
      '............',
    ],
  },
  {
    name: 'The Maze',
    accent: '#b78cff',
    rows: [
      'X1111111111X',
      'X1XX2222XX1X',
      'X1X233332X1X',
      'X1X234432X1X',
      'X1X233332X1X',
      'X1XX2222XX1X',
      'X1111111111X',
    ],
  },
  {
    name: 'The Core',
    accent: '#ff4d6d',
    rows: [
      'XX55555555XX',
      'X544444445X',
      'X543333345X',
      'X543AAAA345X',
      'X543AAAA345X',
      'X543333345X',
      'X544444445X',
      'XX55555555XX',
    ],
  },
];

export const LEVEL_COUNT = LEVELS.length;
