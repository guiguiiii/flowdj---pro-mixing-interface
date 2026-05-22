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

const hoonoTitles = [
  'Call of Silence 4',
  'DECO_27 - Monitoring (Best Friend Remix) feat. Hatsune Miku',
  'PORNOGRAFFITTI THE DAY',
  'Pocket Monsters OP01 - Aim to Be a Pokemon Master',
  'Renai Circulation',
  'Rolling Girl feat. Hatsune Miku - Project DIVA Arcade Future Tone',
  'ZUTOMAYO - Byoushinwo Kamu',
  'Daidaidaidaidaikirai (BIGFIGHT REMIX)',
  'ヨルシカ - 千鳥',
  'ローリンガール - いおぎりょう Remix',
  'ワールドイズマイン [CPK! Remix]',
  '第六感 feat.東京ゲゲゲイ',
  'Kenshi Yonezu - IRIS OUT',
  'Kenshi Yonezu - KICK BACK (Frost Children Remix)',
];

const yiyuTitles = [
  'REBEL HEART',
  'HOT_',
  'Hype Boy',
  'Supernatural',
  'BANG BANG',
  '똑똑똑',
  'Sticky',
  'Cherish (My Love)',
  'Cherish (My Love) (Moonlight Remix)',
  'Do the Dance',
  'Magnetic',
  'OTT',
  'OMG',
];

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
  ...createTaggedTracks({ prefix: 'hoono', tag: 'hoono歌單', titles: hoonoTitles }),
  ...createTaggedTracks({ prefix: 'yiyu', tag: '薏瑀歌單', titles: yiyuTitles }),
  ...createTaggedTracks({ prefix: 'shuting', tag: '輸婷歌單', titles: shutingTitles }),
];
