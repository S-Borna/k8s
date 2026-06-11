export type Track = {
  id: string;
  src: string;
  title: string;
  artist: string;
};

export const playlist: Track[] = [
  { id: "01", src: "/audio/01.mp3", title: "Som Dom", artist: "Sarettii" },
  { id: "02", src: "/audio/02.mp3", title: "No Lie", artist: "Awave" },
  { id: "03", src: "/audio/03.mp3", title: "PIPPI", artist: "Dree Low" },
  { id: "04", src: "/audio/04.mp3", title: "I Might", artist: "Sarettii" },
  { id: "05", src: "/audio/05.mp3", title: "Andale", artist: "LIMO" },
  {
    id: "06",
    src: "/audio/06.mp3",
    title: "Petit génie",
    artist: "Jungeli ft. Imen Es, Alonzo, Lossa, Abou Debeing",
  },
  { id: "07", src: "/audio/07.mp3", title: "REGRET", artist: "Mckay" },
  { id: "08", src: "/audio/08.mp3", title: "Sip (Alcohol)", artist: "Joeboy" },
  { id: "09", src: "/audio/09.mp3", title: "Free Bird", artist: "Lynyrd Skynyrd" },
  { id: "10", src: "/audio/10.mp3", title: "The Beautiful People", artist: "Marilyn Manson" },
  { id: "11", src: "/audio/11.mp3", title: "Smells Like Teen Spirit", artist: "Nirvana" },
  { id: "12", src: "/audio/12.mp3", title: "Värdelös", artist: "Björn Rosenström" },
];
