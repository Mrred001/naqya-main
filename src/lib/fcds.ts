export type FcdsPlaylist = {
  id: string;
  title: string;
  channel: string;
  youtubeUrl: string;
  language: "Arabic" | "English";
};

export type FcdsCourse = {
  name: string;
  slug: string;
  code: string;
  year: string;
  playlists: FcdsPlaylist[];
};

export const fcdsCourses: FcdsCourse[] = [
  {
    name: "Programming I",
    slug: "programming-1",
    code: "CS101",
    year: "السنة الأولى",
    playlists: [
      {
        id: "prog-1",
        title: "Programming I Playlist",
        channel: "Example Channel",
        youtubeUrl: "https://www.youtube.com/",
        language: "English",
      },
    ],
  },
  {
    name: "Calculus",
    slug: "calculus",
    code: "MATH101",
    year: "السنة الأولى",
    playlists: [
      {
        id: "calc-1",
        title: "Calculus Playlist",
        channel: "Example Channel",
        youtubeUrl: "https://www.youtube.com/",
        language: "English",
      },
    ],
  },
  {
    name: "Data Structures",
    slug: "data-structures",
    code: "CS201",
    year: "السنة الثانية",
    playlists: [
      {
        id: "ds-1",
        title: "Data Structures Full Course",
        channel: "Example Channel",
        youtubeUrl: "https://www.youtube.com/",
        language: "English",
      },
      {
        id: "ds-2",
        title: "شرح Data Structures",
        channel: "Example Arabic Channel",
        youtubeUrl: "https://www.youtube.com/",
        language: "Arabic",
      },
    ],
  },
];