import { getDailyWordIndex } from './wordleWords';

/** Daily typing passages – same index as Wordle so "daily" is consistent. */
const PASSAGES = [
  'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.',
  'How vexingly quick daft zebras jump. Sphinx of black quartz judge my vow.',
  'Two driven jocks help fax my big quiz. Five quacking zephyrs jolt my wax bed.',
  'Bright vixens jump; dozy fowl quack. Quick zephyrs blow, vexing daft Jim.',
  'Waltz bad nymph for quick jigs vex. Glib jocks quiz nymph to vex dwarf.',
  'Sphinx of black quartz judge my vow. How quickly daft jumping zebras vex.',
  'Two driven jocks help fax my big quiz. Pack my box with five dozen liquor jugs.',
  'The five boxing wizards jump quickly. Sphinx of black quartz judge my vow.',
  'Crazy Frederick bought many very exquisite opal jewels. We promptly judged antique ivory buckles for the next prize.',
  'Jaded zombies acted quaintly but kept driving their oxen forward. The job requires extra pluck and zeal from every young wage earner.',
  'A quick movement of the enemy will jeopardize six gunboats. All questions asked by five watched experts amaze the judge.',
  'Back in my quaint garden jaunty zebras vaulted and ran by the waxen box. Few quips galvanized the mock jury box.',
  'How razorback jumping frogs can level six piqued gymnasts. Crazy Frederick bought many very exquisite opal jewels.',
  'We have just quoted on nine dozen boxes of gray lap zin. The jay pig and fox ran back to the zoo.',
  'Whenever the black fox jumped the squirrel gazed suspiciously. The lazy dog slept in the sun until the quick cat ran by.',
  'Jaded zombies acted quaintly but kept driving their oxen forward. Pack my box with five dozen liquor jugs.',
  'Five big quacking zephyrs jolt my wax bed. Sphinx of black quartz judge my vow.',
  'The quick brown fox jumps over the lazy dog. How vexingly quick daft zebras jump.',
  'Two driven jocks help fax my big quiz. Waltz bad nymph for quick jigs vex.',
  'Glib jocks quiz nymph to vex dwarf. Crazy Frederick bought many very exquisite opal jewels.',
  'We promptly judged antique ivory buckles for the next prize. The five boxing wizards jump quickly.',
  'All questions asked by five watched experts amaze the judge. Jaded zombies acted quaintly but kept driving their oxen forward.',
  'Whenever the black fox jumped the squirrel gazed suspiciously. A quick movement of the enemy will jeopardize six gunboats.',
  'The lazy dog slept in the sun until the quick cat ran by. Back in my quaint garden jaunty zebras vaulted.',
  'Few quips galvanized the mock jury box. How razorback jumping frogs can level six piqued gymnasts.',
  'The jay pig and fox ran back to the zoo. We have just quoted on nine dozen boxes of gray lap zin.',
  'Sphinx of black quartz judge my vow. Two driven jocks help fax my big quiz.',
  'Pack my box with five dozen liquor jugs. The quick brown fox jumps over the lazy dog.',
  'Five quacking zephyrs jolt my wax bed. Glib jocks quiz nymph to vex dwarf.',
  'Waltz bad nymph for quick jigs vex. How vexingly quick daft zebras jump.',
];

export function getDailyPassage() {
  const index = getDailyWordIndex();
  return PASSAGES[index % PASSAGES.length];
}
