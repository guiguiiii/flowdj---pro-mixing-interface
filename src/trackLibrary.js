export const createLibraryTrack = ({
  id,
  title,
  artist,
  bpm,
  key,
  src,
  duration = '00:00',
  artwork,
  tag,
}) => ({
  id,
  title,
  artist,
  bpm,
  key,
  src,
  duration,
  tag,
  artwork: artwork ?? `https://picsum.photos/seed/${id}/100/100`,
});

const createTaggedTracks = ({ prefix, tag, titles }) => (
  titles.map((title, index) => {
    const number = String(index + 1).padStart(2, '0');

    return createLibraryTrack({
      id: `${prefix}-${number}`,
      title,
      artist: tag,
      bpm: 120,
      key: '8A',
      src: `/audio/${prefix}-${number}.mp3`,
      tag,
    });
  })
);

const shutingTitles = [
  'GAS GAS GAS',
  'HEYYEYAAEYAAAEYAEYAA',
  'OIIA OIIA',
  'MC美江',
  'Spongebob Sings Super Idol',
  '睡衣派對',
  '小八愛拼才會贏',
  'Take On Me',
  'CHIPI CHIPI CHAPA CHAPA',
  'rick+新寶島',
  'Butterfly',
  '崴孟三百天禮物',
  'Gonna Give You Up',
];

export const TRACK_LIBRARY = [
  ...createTaggedTracks({ prefix: 'shuting', tag: '輸婷歌單', titles: shutingTitles }),
];
