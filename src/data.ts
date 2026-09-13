export interface Song {
  id: string;
  slug: string;
  title: string;
  movie: string;
  year: number;
  composer: string;
  singers: string[];
  lyricist: string;
  coverUrl: string;
  backdropUrl: string;
  primaryGlowColor: string;
  secondaryGlowColor: string;
  duration: string;
  lyricsTamil: string[];
  lyricsTanglish: string[];
  activeLineIndexDefault?: number;
  youtubeId?: string | null;
  sourceUrl?: string;
  views?: number;
}

export interface MovieAlbum {
  id: string;
  title: string;
  year: number;
  posterUrl: string;
  trackCount: number;
  backdropUrl?: string;
  composer?: string;
  singers?: string[];
  songs?: Song[];
}

export const slugifyMovieTitle = (title: string): string => {
  return (title || '')
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const getMovieUrl = (movie: { title: string; year?: number }): string => {
  const year = movie.year || 2024;
  const slug = slugifyMovieTitle(movie.title);
  return `/movie/${year}/${slug}`;
};

export interface Artist {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
}

export const sampleSongs: Song[] = [
  {
    "id": "oorum-blood",
    "slug": "oorum-blood-song-lyrics",
    "title": "Oorum Blood",
    "movie": "Suryan (Roja)",
    "year": 1992,
    "composer": "Anirudh Ravichander",
    "singers": [
      "S.P. Balasubrahmanyam",
      "K.S. Chithra"
    ],
    "lyricist": "Vairamuthu",
    "coverUrl": "/oorum-blood-art.jpg",
    "backdropUrl": "/oorum-blood-art.jpg",
    "primaryGlowColor": "#e11d48",
    "secondaryGlowColor": "#ea580c",
    "duration": "4:36",
    "activeLineIndexDefault": 3,
    "lyricsTamil": [
      "ஊரும் பிளட் உடம்பில் ஓடும்",
      "உச்சி முதல் தீப்பாயும்",
      "வேங்கை கூட்டம் கர்ஜிக்கும்",
      "வெற்றி முழக்கம் விண்ணை எட்டும்...",
      "ஊரும் பிளட் உடம்பில் ஓடும்",
      "உச்சி முதல் தீப்பாயும்",
      "வீரம் எங்கள் நெஞ்சில் ஆடும்",
      "தோல்வி என்றும் நாங்கள் அறியோம்",
      "எதிரிகள் நடுங்க களத்தில் இறங்கு",
      "இடியென முழங்கு புயலென திரும்பு...",
      "ஊரும் பிளட் உடம்பில் ஓடும்",
      "உச்சி முதல் தீப்பாயும்"
    ],
    "lyricsTanglish": [
      "Oorum blood udambil odum",
      "Uchi mudhal paadham varai theepaayum",
      "Vengai koottam garjikkum velai",
      "Vetri muzhakkam vinnai ettum...",
      "Oorum blood udambil odum",
      "Uchi mudhal paadham varai theepaayum",
      "Veeram engal nenjil aadum",
      "Tholvi endrum naangal ariyom",
      "Edhirigal nadunga kalathil irangu",
      "Idiyena muzhangu puyalena thirumbu...",
      "Oorum blood udambil odum",
      "Uchi mudhal paadham varai theepaayum"
    ]
  },
  {
    "id": "pookal-pookum",
    "slug": "pookal-pookum-tharunam-song-lyrics",
    "title": "Pookal Pookum Tharunam",
    "movie": "Madrasapattinam",
    "year": 2010,
    "composer": "G.V. Prakash Kumar",
    "singers": [
      "Roop Kumar Rathod",
      "Harini",
      "Andrea Jeremiah"
    ],
    "lyricist": "Na. Muthukumar",
    "coverUrl": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop",
    "backdropUrl": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600&auto=format&fit=crop",
    "primaryGlowColor": "#c084fc",
    "secondaryGlowColor": "#f43f5e",
    "duration": "6:38",
    "activeLineIndexDefault": 2,
    "lyricsTamil": [
      "பூக்கள் பூக்கும் தருணம் ஆருயிரே",
      "பார்த்துக் கூடும் பொழுது",
      "காற்று சொல்லும் கதைகள் யாவும் இங்கே",
      "காதல் கொள்ளும் நினைவே...",
      "பூக்கள் பூக்கும் தருணம் ஆருயிரே",
      "பார்த்துக் கூடும் பொழுது",
      "உயிரே உயிரே என்னோடு வா",
      "கண்கள் பேசும் மௌனம் போதும்",
      "நெஞ்சில் சாயும் காலம் இதுவே",
      "ஆயிரம் ஜென்மம் உன்னோடு வாழவே..."
    ],
    "lyricsTanglish": [
      "Pookal pookum tharunam aaruyire",
      "Paarthu koodum pozhuthu",
      "Kaatru sollum kadhaigal yaavum inge",
      "Kaadhal kollum ninaive...",
      "Pookal pookum tharunam aaruyire",
      "Paarthu koodum pozhuthu",
      "Uyire uyire ennodu vaa",
      "Kangal pesum mounam pothum",
      "Nenjil saayum kaalam idhuve",
      "Aayiram jenmam unnodu vaazhave..."
    ]
  },
  {
    "id": "neelothi",
    "slug": "neelothi-song-lyrics",
    "title": "Neelothi",
    "movie": "Aayirathil Oruvan",
    "year": 2024,
    "composer": "G.V. Prakash Kumar",
    "singers": [
      "Pradeep Kumar",
      "Dhee"
    ],
    "lyricist": "Yugabharathi",
    "coverUrl": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop",
    "backdropUrl": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1600&auto=format&fit=crop",
    "primaryGlowColor": "#0284c7",
    "secondaryGlowColor": "#38bdf8",
    "duration": "4:12",
    "activeLineIndexDefault": 2,
    "lyricsTamil": [
      "நீலோதி வானம் எங்கும் மாயம் காட்டும்",
      "காற்றின் விரல்கள் தீண்டி தீண்டி பாடும்",
      "நிலவே நிலவே நில்லாது ஓடும்",
      "கனவின் நிழலில் காலம் தீரும்...",
      "அலைகள் மோதும் கரையின் ஓரம்",
      "தனிமை விலகும் யiltered புதுமை சேரும்"
    ],
    "lyricsTanglish": [
      "Neelothi vaanam engum maayam kaattum",
      "Kaatrin viralgall theendi theendi paadum",
      "Nilave nilave nillaadhu odum",
      "Kanavin nizhalil kaalam theerum...",
      "Alaigal modhum karaiyin oram",
      "Thanimai vilagum pudhumai serum"
    ]
  },
  {
    "id": "monica",
    "slug": "monica-song-lyrics",
    "title": "Monica",
    "movie": "Coolie",
    "year": 2025,
    "composer": "Anirudh Ravichander",
    "singers": [
      "Anirudh Ravichander",
      "Sublahshini"
    ],
    "lyricist": "Vishnu Edavan",
    "coverUrl": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop",
    "backdropUrl": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1600&auto=format&fit=crop",
    "primaryGlowColor": "#f59e0b",
    "secondaryGlowColor": "#ef4444",
    "duration": "3:48",
    "activeLineIndexDefault": 2,
    "lyricsTamil": [
      "மோனிகா மோனிகா என் தேவதையே",
      "கண்கள் ரெண்டும் போதை ஏத்துதே",
      "இரவுகள் நீளமாய் போகுதே இங்கே",
      "இதயத்தில் தாளங்கள் மாறுதே...",
      "உன்னை பார்த்ததும் உலகமே சுத்துதே",
      "காதல் தீயும் நெஞ்சில் பற்றுதே"
    ],
    "lyricsTanglish": [
      "Monica Monica en dhevadhaiye",
      "Kangal rendum bothai yethudhe",
      "Iravugal neelamaai pogudhe inge",
      "Idhayathil thaalangal maarudhe...",
      "Unnai paarthathum ulagame suthudhe",
      "Kaadhal theeyum nenjil patrudhe"
    ]
  }
];

export const sampleMovies: MovieAlbum[] = [
  {
    "id": "coolie",
    "title": "Coolie",
    "year": 2025,
    "posterUrl": "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=600&auto=format&fit=crop",
    "trackCount": 6
  },
  {
    "id": "thug-life",
    "title": "Thug Life",
    "year": 2025,
    "posterUrl": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop",
    "trackCount": 5
  },
  {
    "id": "kuberaa",
    "title": "Kuberaa",
    "year": 2025,
    "posterUrl": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop",
    "trackCount": 4
  },
  {
    "id": "good-bad-ugly",
    "title": "Good Bad Ugly",
    "year": 2025,
    "posterUrl": "https://images.unsplash.com/photo-1574267432553-4b4628081c31?q=80&w=600&auto=format&fit=crop",
    "trackCount": 5
  },
  {
    "id": "dragon",
    "title": "Dragon",
    "year": 2025,
    "posterUrl": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=600&auto=format&fit=crop",
    "trackCount": 4
  },
  {
    "id": "vidaamuyarchi",
    "title": "Vidaamuyarchi",
    "year": 2025,
    "posterUrl": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop",
    "trackCount": 5
  }
];

export const sampleArtists: Artist[] = [
  {
    "id": "anirudh",
    "name": "Anirudh Ravichander",
    "role": "Music Director",
    "imageUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop"
  },
  {
    "id": "ar-rahman",
    "name": "A.R. Rahman",
    "role": "Music Director",
    "imageUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop"
  },
  {
    "id": "ilaiyaraaja",
    "name": "Ilaiyaraaja",
    "role": "Isaignani",
    "imageUrl": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop"
  },
  {
    "id": "yuvan",
    "name": "Yuvan Shankar Raja",
    "role": "Music Director",
    "imageUrl": "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=400&auto=format&fit=crop"
  },
  {
    "id": "harris",
    "name": "Harris Jayaraj",
    "role": "Music Director",
    "imageUrl": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&auto=format&fit=crop"
  },
  {
    "id": "spb",
    "name": "S.P. Balasubrahmanyam",
    "role": "Legend Singer",
    "imageUrl": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=400&auto=format&fit=crop"
  },
  {
    "id": "sid-sriram",
    "name": "Sid Sriram",
    "role": "Playback Singer",
    "imageUrl": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=400&auto=format&fit=crop"
  },
  {
    "id": "vairamuthu",
    "name": "Vairamuthu",
    "role": "Lyricist",
    "imageUrl": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=400&auto=format&fit=crop"
  }
];