/** Wilderness prompt scenes. Server DCs must stay aligned by index. */

export const ADVENTURE_ENCOUNTERS = [
  {
    prompt: 'A goblin scout steps onto the trail and raises a rusted blade. What do you do?',
    options: [
      { key: 'A', label: 'Fight it', dc: 10, success: 'Your Imp strikes first. The goblin flees and drops a scrap of dungeon map.', failure: 'The goblin lands a glancing blow before your party drives it back into the brush.' },
      { key: 'B', label: 'Flee into the woods', dc: 8, success: 'Your party disappears between the trees before the goblin can sound an alarm.', failure: 'A snapped branch gives you away. You escape, but the goblin warns the road ahead.' },
    ],
  },
  {
    prompt: 'A broken rope bridge hangs over a black ravine. The map points to the far side.',
    options: [
      { key: 'A', label: 'Leap across', dc: 13, success: 'You clear the gap and pull the rest of the party safely across.', failure: 'The ledge crumbles. You catch the rope and climb back up, shaken but alive.' },
      { key: 'B', label: 'Repair the bridge', dc: 9, success: 'Your careful knots hold. The party crosses without drawing attention.', failure: 'The old rope tears. You lose time searching for another secure anchor.' },
    ],
  },
  {
    prompt: 'Ancient runes glow across a sealed stone archway. Something is moving behind it.',
    options: [
      { key: 'A', label: 'Study the runes', dc: 11, success: 'The symbols reveal a safe phrase and the archway opens without a sound.', failure: 'The runes flare red. A distant bell echoes through the buried halls.' },
      { key: 'B', label: 'Force the door', dc: 14, success: 'Stone cracks beneath your combined strength, revealing a forgotten passage.', failure: 'The door holds and dust rains from the ceiling. Something heard the impact.' },
    ],
  },
  {
    prompt: 'A skeletal guardian blocks the final stair, clutching a key carved from obsidian.',
    options: [
      { key: 'A', label: 'Challenge the guardian', dc: 12, success: 'The guardian falls apart. The obsidian key remains warm in your hand.', failure: 'Its shield turns your attack. Your party retreats and searches for an opening.' },
      { key: 'B', label: 'Distract and steal the key', dc: 13, success: 'Your feint works. An Imp slips behind the guardian and takes the key.', failure: 'The guardian sees through the trick and seals the stair behind its shield.' },
    ],
  },
  {
    prompt: 'The obsidian key hums beside an unmarked dungeon gate. How will you enter?',
    options: [
      { key: 'A', label: 'Turn the key', dc: 7, success: 'The lost keep answers. Its buried halls begin to form beyond the gate.', failure: 'The lock resists. You steady the key and feel another route awaken nearby.' },
      { key: 'B', label: 'Search for traps first', dc: 10, success: 'You uncover a hidden ward and disable it before opening the dungeon gate.', failure: 'No trap is found, but the delay draws restless shapes toward your torchlight.' },
    ],
  },
  {
    prompt: 'A mossy ledge juts over a sinkhole. Faint torchlight flickers somewhere below.',
    options: [
      { key: 'A', label: 'Climb down the ledge', dc: 12, success: 'You find a smugglers’ shelf packed with chalk marks that match your dungeon map.', failure: 'Loose stone skitters into the dark. You haul yourselves back up, coughing dust.' },
      { key: 'B', label: 'Toss a torch and watch', dc: 8, success: 'The light reveals a safe chimney of roots you can descend without a sound.', failure: 'The torch snuffs out. You learn nothing except that the hole is deeper than it looks.' },
    ],
  },
  {
    prompt: 'Three wild boars block a berry thicket, tusks wet and ears flat.',
    options: [
      { key: 'A', label: 'Drive them off', dc: 11, success: 'The boars scatter. Your Impz stuff their packs with tart trail berries.', failure: 'A tusk scrapes a pack strap. You keep the path, but breakfast is ruined.' },
      { key: 'B', label: 'Circle through the thorns', dc: 9, success: 'You slip around unseen and leave the boars to their feast.', failure: 'Thorns snag a cloak. The largest boar notices, and you spend minutes calming it with food.' },
    ],
  },
  {
    prompt: 'A merchant’s cart is stuck in black mud, its owner waving a stained map.',
    options: [
      { key: 'A', label: 'Help free the cart', dc: 8, success: 'Grateful, the merchant marks a hidden ford that saves you an hour of bog.', failure: 'The wheel snaps anyway. You waste time, but the merchant still shares a rumor of ruins.' },
      { key: 'B', label: 'Buy the map and move on', dc: 10, success: 'The map is real. A faded X matches a keep symbol you have been hunting.', failure: 'The ink smears. You paid for directions that loop you back to the same stump.' },
    ],
  },
  {
    prompt: 'A talking raven lands on a milestone and croaks, “Password or pecking.”',
    options: [
      { key: 'A', label: 'Guess a password', dc: 13, success: 'The raven bows and drops a brass token stamped with a dungeon sigil.', failure: 'Wrong word. It pecks a hat and flies off laughing.' },
      { key: 'B', label: 'Offer it a shiny button', dc: 7, success: 'The raven pockets the button and points a wing toward a safer game trail.', failure: 'It takes the button and still pecks you, then shrugs as if that were the deal.' },
    ],
  },
  {
    prompt: 'Fog swallows the trail. You hear dripping water but cannot see the stream.',
    options: [
      { key: 'A', label: 'Follow the sound', dc: 10, success: 'You find a stone culvert that leads under the ridge toward older roads.', failure: 'You walk in a circle. When the fog lifts, you are only a few paces from where you started.' },
      { key: 'B', label: 'Wait it out', dc: 8, success: 'The fog thins. Fresh tracks show a patrol that passed while you stayed hidden.', failure: 'Cold seeps in. You stay dry, but the delay lets the trail of dungeon-seekers go cold.' },
    ],
  },
  {
    prompt: 'A rusted portcullis bars a culvert. Something clicks on the other side.',
    options: [
      { key: 'A', label: 'Lift it together', dc: 14, success: 'The grate rises. A dry tunnel smells of old keep mortar.', failure: 'It drops an inch and pinches a strap. You back out before it traps a tail.' },
      { key: 'B', label: 'Oil the hinges first', dc: 9, success: 'Quiet as a sigh, the grate slides. Nobody on the far side notices.', failure: 'The oil is rancid. The click becomes a shout, and you retreat before the watch arrives.' },
    ],
  },
  {
    prompt: 'An abandoned camp still steams. A stew pot bubbles with no cook in sight.',
    options: [
      { key: 'A', label: 'Taste the stew', dc: 11, success: 'It is honest trail food. Strength returns, and you pocket a dropped keep sketch.', failure: 'It is spiced for goblin tongues. You spit, cough, and keep walking thirsty.' },
      { key: 'B', label: 'Search the bedrolls', dc: 10, success: 'Under a blanket you find a charcoal rubbing of a dungeon lintel.', failure: 'A snare yanks a pack. The owner is gone, but the trap still works.' },
    ],
  },
  {
    prompt: 'A landslide of pale gravel has buried half the switchback.',
    options: [
      { key: 'A', label: 'Scramble over', dc: 12, success: 'You crest the slide and spot a cave mouth the maps never named.', failure: 'Gravel gives. You slide back, scraped, and take the long way around.' },
      { key: 'B', label: 'Cut a new path below', dc: 9, success: 'The lower trail is slower but solid, and it reveals a carved waystone.', failure: 'You detour into brambles. The waystone is real, but your cloaks are rags.' },
    ],
  },
  {
    prompt: 'A will-o’-wisp bobs above a marsh, matching your torch’s sway.',
    options: [
      { key: 'A', label: 'Follow it', dc: 13, success: 'It leads to a dry hummock where a keep key-hole is cut into black wood.', failure: 'It lures you into knee-deep muck. You haul free, boots heavier, pride lighter.' },
      { key: 'B', label: 'Ignore it and mark the true north', dc: 8, success: 'Compass work pays off. You leave the marsh on a hunter’s boardwalk.', failure: 'You second-guess the needle and waste an hour arguing with an Imp about moss.' },
    ],
  },
  {
    prompt: 'Two rival squirrels scream from one oak, each clutching the same acorn-shaped locket.',
    options: [
      { key: 'A', label: 'Mediate the dispute', dc: 10, success: 'They split the locket. Inside is a miniature dungeon floorplan.', failure: 'They both bite. You leave with scratches and no map.' },
      { key: 'B', label: 'Climb and snatch it', dc: 12, success: 'An Imp returns with the locket and a view of smoke from a distant chimney-keep.', failure: 'A branch snaps. You hit the loam unhurt, while the squirrels vanish with the prize.' },
    ],
  },
  {
    prompt: 'A knight’s helmet sits on a stump, visor down, humming a lullaby.',
    options: [
      { key: 'A', label: 'Lift the visor', dc: 11, success: 'Only moths. A note inside names a keep that answers to moonlight.', failure: 'A spring-pop scarecrow laughs. You jump, then pocket the harmless joke-note anyway.' },
      { key: 'B', label: 'Leave an offering and pass', dc: 7, success: 'The humming stops. The path ahead feels watched in a friendly way.', failure: 'Nothing happens. You feel foolish, which is still safer than poking haunted steel.' },
    ],
  },
  {
    prompt: 'A river ford is waist-deep and fast. A fallen pine leans halfway across.',
    options: [
      { key: 'A', label: 'Walk the pine', dc: 13, success: 'Balance holds. You keep packs dry and find a fisher’s cache on the far bank.', failure: 'An Imp slips. Everyone is soaked, but you crawl to shore with the map intact.' },
      { key: 'B', label: 'Rope up and wade', dc: 9, success: 'Slow and sure. A submerged milestone points toward buried stairs.', failure: 'Current tugs. You lose a loaf, not a friend, and crawl out shivering.' },
    ],
  },
  {
    prompt: 'Mushrooms in a ring pulse faint blue. One Imp already has a cap in its mouth.',
    options: [
      { key: 'A', label: 'Spit it out, now', dc: 8, success: 'The Imp obeys. You bag a safer sample that later matches dungeon spore-maps.', failure: 'Too late. The Imp giggles and walks in spirals until the laugh fades.' },
      { key: 'B', label: 'Ask the ring a question', dc: 14, success: 'A voice in the moss answers with a keep’s true name.', failure: 'Silence, then a sneeze of spores. You wipe your eyes and move on, none the wiser.' },
    ],
  },
  {
    prompt: 'A wanted poster shows a smiling mimic chest. The ink is still wet.',
    options: [
      { key: 'A', label: 'Hunt the mimic', dc: 12, success: 'You find it disguised as a trail shrine. It yields a genuine keep token before fleeing.', failure: 'It bites a stick, not a hand. You jump back and it galumphs into the brush.' },
      { key: 'B', label: 'Warn the next camp', dc: 8, success: 'Hunters share a shortcut as thanks, away from mimic country.', failure: 'Nobody believes you. You still avoid every suspiciously friendly crate.' },
    ],
  },
  {
    prompt: 'Hail hammers the ridge. A shallow cave offers cover, and also a snoring shape.',
    options: [
      { key: 'A', label: 'Share the cave quietly', dc: 10, success: 'It is a sleeping bear. You wait out the storm and leave a fish apology.', failure: 'A snore becomes a growl. You sprint into hail and look like walking ice.' },
      { key: 'B', label: 'Build a windbreak outside', dc: 9, success: 'The lean-to holds. Hail drums like drums, and you spot a keep weather-vane on the next peak.', failure: 'The windbreak collapses. You are wet, but the bear still has the cave.' },
    ],
  },
  {
    prompt: 'A child’s kite is stuck in a thorn tree, string leading toward a cliff edge.',
    options: [
      { key: 'A', label: 'Climb for the kite', dc: 11, success: 'The kite’s tail is a painted dungeon banner. A grateful kid points you to a well.', failure: 'Thorns win. The kite tears free and sails into mist.' },
      { key: 'B', label: 'Cut the string and reel', dc: 8, success: 'It flutters down. The painting still shows a keep’s silhouette.', failure: 'The string snaps. The kite becomes a rumor on the wind.' },
    ],
  },
  {
    prompt: 'Stone faces in a cliff weep clear water into a basin carved like a keep.',
    options: [
      { key: 'A', label: 'Drink', dc: 9, success: 'The water tastes of rain and iron. Your map-ink darkens, revealing a hidden wing.', failure: 'It is only meltwater. You refill skins and keep the superstition anyway.' },
      { key: 'B', label: 'Fill a vial for later', dc: 10, success: 'Labelling it “gate tears” feels silly until a later lock sighs open near the scent.', failure: 'The vial cracks. You have wet pockets and a good story.' },
    ],
  },
  {
    prompt: 'A patrol of tin soldiers, knee-high, demands a toll of “one interesting pebble.”',
    options: [
      { key: 'A', label: 'Pay with a sparkly rock', dc: 7, success: 'They salute and part, revealing a toy-sized model of a real keep nearby.', failure: 'They inspect it, declare it boring, and make you hop on one foot as tax.' },
      { key: 'B', label: 'Argue the law of the road', dc: 12, success: 'Your speech impresses their captain. They gift a paper crown that marks you as friend.', failure: 'They boo. You pay two pebbles and your dignity.' },
    ],
  },
  {
    prompt: 'Lightning splits a tree. Inside the trunk is a dry hollow stacked with sealed letters.',
    options: [
      { key: 'A', label: 'Read one letter', dc: 10, success: 'It is a love note that also describes a keep’s servant stair.', failure: 'The letter is in a cipher you cannot crack before rain returns.' },
      { key: 'B', label: 'Leave them and take only shelter', dc: 8, success: 'You stay dry. As you leave, a letter falls open to a keep sketch on its own.', failure: 'Wind scatters the stack. You salvage nothing but splinters.' },
    ],
  },
  {
    prompt: 'A goat stands on a boulder chewing a dungeon pennant.',
    options: [
      { key: 'A', label: 'Trade it a carrot', dc: 8, success: 'The goat drops the pennant. The emblem matches a keep you have only heard in songs.', failure: 'It eats the carrot and the pennant. You get a sticky emblem scrap.' },
      { key: 'B', label: 'Wrestle the flag free', dc: 12, success: 'You win a muddy tug-of-war and a surprisingly accurate keep badge.', failure: 'The goat wins. You are downhill, flagless, and slightly more humble.' },
    ],
  },
  {
    prompt: 'Clockwork beetles tick across the path, carrying grains of gold toward a hole.',
    options: [
      { key: 'A', label: 'Follow the gold trail', dc: 13, success: 'The hole is a vent into a buried vault antechamber.', failure: 'The beetles vanish. You are left staring at ordinary dirt.' },
      { key: 'B', label: 'Scoop a beetle for study', dc: 11, success: 'Its back is etched with a keep’s floor numbers.', failure: 'It nips and burrows. You have a tiny hole in a glove.' },
    ],
  },
  {
    prompt: 'A bard by a fire offers a song in exchange for a true secret.',
    options: [
      { key: 'A', label: 'Share a harmless secret', dc: 9, success: 'The song encodes a keep password in its chorus.', failure: 'The bard yawns. You get a ditty about mud and no maps.' },
      { key: 'B', label: 'Ask them to play first', dc: 11, success: 'Impressed by your nerve, they play a keep-lament with accurate directions.', failure: 'They play off-key on purpose until you leave, ears ringing.' },
    ],
  },
  {
    prompt: 'Webbing bars a hollow. Something large breathes behind it, slow and wet.',
    options: [
      { key: 'A', label: 'Burn a small gap', dc: 12, success: 'The web parts. Beyond is a molted spider husk and a keep-shaped egg of resin.', failure: 'Smoke draws the breath closer. You stamp the fire and run.' },
      { key: 'B', label: 'Cut a silent slit', dc: 10, success: 'You slip past a sleeping hunter and pocket a silk cord useful for later climbs.', failure: 'A strand sticks to an Imp’s horns. You spend minutes unsticking in panic-whispers.' },
    ],
  },
  {
    prompt: 'A well in a ruined hamlet echoes when you drop a pebble—then the pebble drops again, later.',
    options: [
      { key: 'A', label: 'Lower an Imp on a rope', dc: 14, success: 'There is a second floor of the well: a keep cistern with carved names.', failure: 'The Imp yells “echo!” too loudly. You haul them up before the second drop answers.' },
      { key: 'B', label: 'Map the delay and move on', dc: 8, success: 'The timing matches a known dungeon depth. You mark it and keep walking smarter.', failure: 'You miscount. The well remains a mystery with a good camp story.' },
    ],
  },
  {
    prompt: 'Crows have arranged sticks into an arrow pointing off-trail.',
    options: [
      { key: 'A', label: 'Trust the crows', dc: 10, success: 'They lead you to a picnic of lost adventurer rations and a keep postcard.', failure: 'It is a crow joke. You find a shiny bottle cap and their laughter.' },
      { key: 'B', label: 'Stay on the marked path', dc: 7, success: 'Discipline pays. A ranger cairn confirms you are still on the keep road.', failure: 'You ignore a real shortcut. The path is longer, but you do not get lost.' },
    ],
  },
  {
    prompt: 'A cracked sundial shows midnight at noon. Its shadow points at your pack.',
    options: [
      { key: 'A', label: 'Empty the pack', dc: 9, success: 'A keep coin you forgot you had is warm. The sundial’s shadow swings true north.', failure: 'Nothing special is inside. The sundial keeps lying, and so does the weather.' },
      { key: 'B', label: 'Turn the dial to noon', dc: 13, success: 'Stone clicks. A panel opens on a miniature keep door with a real keyhole.', failure: 'The gnomon snaps. You leave a broken antique and a guilty look.' },
    ],
  },
  {
    prompt: 'An old fisher offers to ferry you across a lake “if you don’t look down.”',
    options: [
      { key: 'A', label: 'Accept and stare at the sky', dc: 8, success: 'You dock at a forgotten quay carved with keep merlons.', failure: 'You peek. Pale lights swirl under the hull. The fisher sighs and charges extra fear.' },
      { key: 'B', label: 'Walk the long shoreline', dc: 10, success: 'You find beached timbers from a keep barge and a still-legible cargo mark.', failure: 'Mudflats grab boots. The ferry is already gone when you arrive, waving.' },
    ],
  },
  {
    prompt: 'A scarecrow’s coat pockets jingle. Its stitched smile is too wide.',
    options: [
      { key: 'A', label: 'Pick the pockets', dc: 11, success: 'You lift keep-ward chimes that hush the next watch-beast you meet.', failure: 'A mouse family protests. You return the grain and keep walking poorer.' },
      { key: 'B', label: 'Bow and ask permission', dc: 9, success: 'Wind flaps the coat. A brass keep-button drops as if in payment for manners.', failure: 'Silence. You feel judged by straw, which is somehow worse than goblins.' },
    ],
  },
  {
    prompt: 'Hot springs steam beside ice. A painted sign reads “One dip. One truth.”',
    options: [
      { key: 'A', label: 'Take the dip', dc: 10, success: 'Warmth unknots your shoulders. You remember a keep rumor you had dismissed.', failure: 'It is too hot. You hop out pink and wiser only about temperature.' },
      { key: 'B', label: 'Skip and bottle the steam', dc: 12, success: 'Condensate forms keep-runes on the glass.', failure: 'The bottle fogs. You have spa water and no prophecy.' },
    ],
  },
  {
    prompt: 'A chessboard is inlaid in a courtyard, pieces frozen mid-game. It is your move as black.',
    options: [
      { key: 'A', label: 'Move the knight', dc: 11, success: 'A flagstone sinks, revealing a keep spiral stair.', failure: 'Wrong move. A harmless puff of flour marks you as the loser.' },
      { key: 'B', label: 'Resign politely', dc: 8, success: 'The white king nods. A side door unlatches for good sports.', failure: 'The board ignores you. You step around it like any other patio.' },
    ],
  },
  {
    prompt: 'Night-blooming lilies open and whisper your party’s names, slightly wrong.',
    options: [
      { key: 'A', label: 'Correct them', dc: 10, success: 'They blush (as flowers can) and gift pollen that glows near keep stone.', failure: 'They argue about pronunciation until you walk away, names still misspelled.' },
      { key: 'B', label: 'Listen for a keep name instead', dc: 13, success: 'Between the errors they murmur a vault’s true title.', failure: 'They only gossip about who stole whose hat.' },
    ],
  },
  {
    prompt: 'A hanging cage over a gorge holds a talking skull that wants gossip.',
    options: [
      { key: 'A', label: 'Trade camp rumors', dc: 9, success: 'The skull tells you which gorge rope is not secretly a snake.', failure: 'It already heard that one. It rattles boredly until you leave.' },
      { key: 'B', label: 'Swing over and free it', dc: 14, success: 'Grateful, it clacks a keep password against the bars as you go.', failure: 'The cage spins. You abort the heroics and keep your bones on this side.' },
    ],
  },
  {
    prompt: 'Fresh wagon ruts split: left toward smoke, right toward singing.',
    options: [
      { key: 'A', label: 'Follow the smoke', dc: 10, success: 'A charcoal burner’s kiln hides a keep brick in its wall.', failure: 'It is only a hunter’s fire. They share jerky and no secrets.' },
      { key: 'B', label: 'Follow the singing', dc: 11, success: 'Pilgrims teach a walking hymn that is also a keep floor-count.', failure: 'It is drunk frogs. Very committed drunk frogs.' },
    ],
  },
  {
    prompt: 'An echo in a canyon answers one word later than it should, in a different voice.',
    options: [
      { key: 'A', label: 'Call a keep’s name', dc: 12, success: 'The late voice replies with a gate-ward you can reuse.', failure: 'It repeats you mockingly. The canyon has jokes.' },
      { key: 'B', label: 'Stay quiet and watch', dc: 8, success: 'You see the “echo” is a hermit with a cone. They sell accurate keep gossip cheap.', failure: 'You wait too long. The hermit naps, cone over face.' },
    ],
  },
  {
    prompt: 'A crate of fireworks sits unattended with a note: “For the keep festival. Do not.”',
    options: [
      { key: 'A', label: 'Leave them', dc: 7, success: 'A festival runner thanks you later and stamps your map with a keep seal.', failure: 'Nobody comes. You did the right thing in an empty road.' },
      { key: 'B', label: 'Take one sparkler', dc: 11, success: 'It lights a hidden mural of a keep when struck on wet stone.', failure: 'It fizzles. You smell like a birthday and look suspicious.' },
    ],
  },
  {
    prompt: 'Wolves pace parallel to you in the treeline, matching your speed.',
    options: [
      { key: 'A', label: 'Offer dried meat', dc: 9, success: 'They take it and peel off, leaving a deer trail that hugs a keep ditch.', failure: 'They ignore the meat. You keep a calm pace until they get bored.' },
      { key: 'B', label: 'Show teeth and hold ground', dc: 13, success: 'The lead wolf huffs respect and turns. You keep the road and your nerve.', failure: 'They melt away anyway. You feel heroic at a pack that already left.' },
    ],
  },
  {
    prompt: 'A library on wheels is stuck in a rut, books spilling like a shuffled deck.',
    options: [
      { key: 'A', label: 'Reshelve a few', dc: 8, success: 'The librarian gifts a pamphlet: “Keeps of the Border, 3rd ed.”', failure: 'You shelve poetry under plumbing. They still thank you, tightly.' },
      { key: 'B', label: 'Ask for the keep section', dc: 10, success: 'A folio falls open to your exact destination, annotated in brown ink.', failure: 'The keep section is “checked out by a goat.” You get a rain check.' },
    ],
  },
  {
    prompt: 'A rainbow ends in a puddle. The puddle shows a keep ceiling instead of sky.',
    options: [
      { key: 'A', label: 'Reach in', dc: 14, success: 'Your hand comes back dry, holding a keep brick-chip still warm.', failure: 'You get a wet sleeve and a minnow’s judgment.' },
      { key: 'B', label: 'Sketch the reflection', dc: 9, success: 'The sketch matches a real vault rib you will recognize on sight.', failure: 'The rainbow fades mid-line. You have half a masterpiece.' },
    ],
  },
  {
    prompt: 'Goblins argue over a frying pan that is also, somehow, a drum.',
    options: [
      { key: 'A', label: 'Settle it with a cook-off', dc: 10, success: 'They crown you judge and gift burnt toast stamped with a keep crest.', failure: 'The pan-drum starts a dance. You escape before the second verse.' },
      { key: 'B', label: 'Sneak the pan away', dc: 12, success: 'It is a signaling pan. Beating it once opens a nearby shuttered keep-window in the cliff.', failure: 'They notice. You return it with compliments on their rhythm.' },
    ],
  },
  {
    prompt: 'A rope ladder hangs from a cloud that is probably not a cloud.',
    options: [
      { key: 'A', label: 'Climb', dc: 13, success: 'It is a tethered sky-barge. The captain trades a keep weather-chart for news.', failure: 'The “cloud” is laundry. A very high, very embarrassed laundry.' },
      { key: 'B', label: 'Yank the rope', dc: 8, success: 'A basket lowers with a keep-shaped bun and a note: “Try the east stair.”', failure: 'Nothing. You look like you are fighting invisible clothes.' },
    ],
  },
  {
    prompt: 'Footprints in frost walk backward up the hill.',
    options: [
      { key: 'A', label: 'Walk them in reverse', dc: 11, success: 'The trick reveals a keep postern hidden by a snow cornice.', failure: 'You look silly and cold. The prints are just a fox having a day.' },
      { key: 'B', label: 'Warm a pan and melt a print', dc: 9, success: 'Under ice is a brass keep arrowhead pointing true.', failure: 'You make a sad slush puddle. The hill remains mysterious.' },
    ],
  },
  {
    prompt: 'A notice board offers “Lost: one shadow. Answers to the name Keep.”',
    options: [
      { key: 'A', label: 'Look for a loose shadow', dc: 12, success: 'You find it stuck to a sundial. It slides back to a grateful wizard who marks your map.', failure: 'Every shadow looks suspicious. None of them are named Keep.' },
      { key: 'B', label: 'Leave a note with your route', dc: 8, success: 'The wizard finds you later with keep-ink and thanks.', failure: 'Your note blows away. Somewhere, a shadow remains unemployed.' },
    ],
  },
  {
    prompt: 'Bees have built a hive in a knight’s visor on a fencepost.',
    options: [
      { key: 'A', label: 'Smoke them gently', dc: 10, success: 'They move. Inside the helm is a keep-beeswax seal still imprinted.', failure: 'They object. You run, heroic and dotted with welts.' },
      { key: 'B', label: 'Leave honey and pass', dc: 7, success: 'The hive drones a pitch that later matches a keep door-tone.', failure: 'They ignore the honey. You still did not get stung, which counts.' },
    ],
  },
  {
    prompt: 'A pendulum clock stands in a field, ticking in time with your steps.',
    options: [
      { key: 'A', label: 'Stop walking', dc: 8, success: 'The clock stops too, then chimes a keep hour that is not this hour.', failure: 'It keeps ticking. You feel personally attacked by furniture.' },
      { key: 'B', label: 'Open the case', dc: 13, success: 'The weights are keep keys on chains.', failure: 'Dust and a moth. The moth is not a clue. It is just a moth.' },
    ],
  },
  {
    prompt: 'Someone has stacked cairns into the exact silhouette of a keep.',
    options: [
      { key: 'A', label: 'Add one stone', dc: 9, success: 'The stack settles. A hollow in the base holds a folded dungeon flyer.', failure: 'It topples. You rebuild it worse, artistically.' },
      { key: 'B', label: 'Walk around it sunwise', dc: 11, success: 'On the far side the real keep’s weather-vane aligns with the cairn’s peak.', failure: 'You get dizzy and no omen, only sheep watching.' },
    ],
  },
  {
    prompt: 'A polite ogre asks if you have seen his lost spoon. It is the size of an oar.',
    options: [
      { key: 'A', label: 'Help search', dc: 8, success: 'You find it in a creek. He stirs the water and a keep-shaped whirlpool points downstream.', failure: 'No spoon. He sighs like a landslide and gives you a toothpick-log anyway.' },
      { key: 'B', label: 'Offer a normal spoon', dc: 10, success: 'He is delighted by the “tiny friend-spoon” and sketches a keep gate in mud.', failure: 'He tries to use it. There is no more tiny spoon.' },
    ],
  },
  {
    prompt: 'Lanterns hang in a dead orchard, each labelled with a different year.',
    options: [
      { key: 'A', label: 'Light this year’s', dc: 10, success: 'Moths spiral into a keep constellation you can copy.', failure: 'The wick is damp. You smell oil and missed chances.' },
      { key: 'B', label: 'Light the oldest', dc: 14, success: 'A ghost orchardist nods and mouths a keep cellar’s count of steps.', failure: 'Nothing but smoke. The years keep their secrets.' },
    ],
  },
  {
    prompt: 'A riddle is carved on a turtle’s shell as it crosses the road, very slowly.',
    options: [
      { key: 'A', label: 'Read while walking beside it', dc: 9, success: 'The answer is “keep.” The turtle blinks as if you are late but correct.', failure: 'You trip. The turtle is gone into grass with the last line unread.' },
      { key: 'B', label: 'Offer lettuce for a hint', dc: 8, success: 'It eats, then turns so a keep-glyph on its plastron faces you.', failure: 'It ignores lettuce. Turtles have standards.' },
    ],
  },
  {
    prompt: 'A minecart rests on a single rail that ends in flowers.',
    options: [
      { key: 'A', label: 'Push it', dc: 12, success: 'Hidden track clicks down. The cart rolls into a keep service tunnel.', failure: 'It derails immediately into daisies. Pretty. Unhelpful.' },
      { key: 'B', label: 'Search under the cart', dc: 10, success: 'A maintenance chalk-mark lists keep shaft depths.', failure: 'Just rust and a sandwich fossil.' },
    ],
  },
  {
    prompt: 'Your shadows stretch toward a standing stone even though the sun is behind you.',
    options: [
      { key: 'A', label: 'Touch the stone', dc: 11, success: 'It is warm. A keep-spiral glows, then fades into your palm like a ticket.', failure: 'It is just a rock that wins a staring contest.' },
      { key: 'B', label: 'Walk around until shadows behave', dc: 8, success: 'At the right angle you see the stone is a keep merlon fallen from a ridge.', failure: 'Shadows stay weird. You blame the Imps, who blame the sun.' },
    ],
  },
  {
    prompt: 'A baker in the middle of nowhere is selling “maps you can eat.”',
    options: [
      { key: 'A', label: 'Buy a keep-shaped bun', dc: 7, success: 'Icing lines are actual corridors. You copy them before anyone gets hungry.', failure: 'It is delicious and geographically useless.' },
      { key: 'B', label: 'Ask for yesterday’s leftovers', dc: 10, success: 'Stale crust still shows a keep courtyard you have not seen on paper.', failure: 'Leftovers are crumbs. You feed birds who do not know dungeons.' },
    ],
  },
  {
    prompt: 'Icicles play a scale when wind hits the cliff. One note is missing.',
    options: [
      { key: 'A', label: 'Break the wrong icicle', dc: 13, success: 'The missing note was a keep bell-tone. The cliff-face slides a handspan, showing a slit-window.', failure: 'You make a worse song and a small avalanche of sparkle.' },
      { key: 'B', label: 'Hum the missing note', dc: 11, success: 'Resonance answers from inside the rock: a keep choir-loft, empty and near.', failure: 'Your pitch is optimistic. The cliff is unmoved.' },
    ],
  },
  {
    prompt: 'A fence of spears has laundry drying on it. The socks have keep crests.',
    options: [
      { key: 'A', label: 'Knock and return a sock', dc: 8, success: 'A hermit invites you for tea and accurate keep gossip.', failure: 'Nobody is home. You pin the sock back like a responsible burglar.' },
      { key: 'B', label: 'Sketch the crest', dc: 9, success: 'It matches a banner you will see on a real gate.', failure: 'Your sketch looks like a potato with pride.' },
    ],
  },
  {
    prompt: 'A sinkhole opened overnight. At the bottom, a perfectly set dinner for four.',
    options: [
      { key: 'A', label: 'Climb down to the table', dc: 12, success: 'Place-cards are keep rooms. The soup is cold. The clue is not.', failure: 'The table is glued illusion. You climb out hungry and impressed.' },
      { key: 'B', label: 'Lower a hook for a napkin', dc: 10, success: 'The napkin map is drawn in wine: a keep buttery marked X.', failure: 'You hook a chair. The dinner remains theatrical and out of reach.' },
    ],
  },
  {
    prompt: 'Fireflies spell letters, then scatter before you finish reading.',
    options: [
      { key: 'A', label: 'Ask them to repeat', dc: 11, success: 'They spell KEEP, then a number that matches a vault combination rumor.', failure: 'They spell LOL and disperse, comedians of the meadow.' },
      { key: 'B', label: 'Catch the pattern in a jar', dc: 13, success: 'In glass they still pulse the keep number, slower, copyable.', failure: 'They go dark, offended by captivity. You let them go.' },
    ],
  },
  {
    prompt: 'A duel is happening between two scarecrows with wooden swords. A crowd of crows judges.',
    options: [
      { key: 'A', label: 'Referee fairly', dc: 9, success: 'The winner tosses you a keep-ribbon from its sleeve.', failure: 'You call it wrong. The crows boo in harmony.' },
      { key: 'B', label: 'Steal a sword during a clash', dc: 12, success: 'It is painted with keep-stair counts on the flat.', failure: 'You get bonked by straw. The duel continues without you.' },
    ],
  },
  {
    prompt: 'Rain falls only in a perfect square. Inside it, the ground is dry.',
    options: [
      { key: 'A', label: 'Stand in the dry square', dc: 10, success: 'A keep floorplan of wet prints appears around your boots.', failure: 'You get the one leak in the miracle. Classic.' },
      { key: 'B', label: 'Walk the rain’s edge', dc: 8, success: 'The square is a keep courtyard’s exact measure. You pace it and know the scale.', failure: 'You slip in mud and invent a new dance.' },
    ],
  },
  {
    prompt: 'A signpost spins slowly, all four arms reading “almost.”',
    options: [
      { key: 'A', label: 'Hold it still at north', dc: 11, success: 'The other arms click to keep, well, and “don’t.” Useful enough.', failure: 'It spins faster, offended. You let go before it becomes a fan.' },
      { key: 'B', label: 'Follow the arm that creaks', dc: 9, success: 'The creaky way is unused and leads to a keep kitchen garden gone wild.', failure: 'It creaks because it is broken. You find a nice stump.' },
    ],
  },
  {
    prompt: 'An Imp from another party is stuck in a hollow log, waving politely.',
    options: [
      { key: 'A', label: 'Pull them out', dc: 8, success: 'They gift you their spare keep-charm and a warning about the next fork.', failure: 'You pull, they pop, everyone falls. Charming, no charm.' },
      { key: 'B', label: 'Push the log apart', dc: 12, success: 'The log was a keep drain-pipe. Inside: dry, chalked directions.', failure: 'The log is just a log. The Imp is free and slightly insulted.' },
    ],
  },
  {
    prompt: 'Stars are visible at midday in a well of shade under ancient yews.',
    options: [
      { key: 'A', label: 'Navigate by those stars', dc: 13, success: 'They form a keep asterism pointing to a ridge door.', failure: 'You mix up constellations and walk toward a very confident bush.' },
      { key: 'B', label: 'Nap until real night', dc: 7, success: 'Rested, you notice yew-carved keep arrows you missed while tired.', failure: 'You oversleep. The shade-stars are gone, but so is your headache.' },
    ],
  },
  {
    prompt: 'A tax collector of the old kingdom wants “one story” as duty.',
    options: [
      { key: 'A', label: 'Tell a true story', dc: 9, success: 'They stamp a keep-pass that still impresses rusted locks.', failure: 'They wanted more dragons. You owe them a sequel.' },
      { key: 'B', label: 'Tell a spectacular lie', dc: 12, success: 'They love it and waive the next three bridges, one of which is a keep drawbridge.', failure: 'They take notes for court. You walk faster.' },
    ],
  },
  {
    prompt: 'Mud preserves a perfect imprint of a keep door, ironwork and all.',
    options: [
      { key: 'A', label: 'Pour plaster', dc: 10, success: 'The cast later matches a real door’s hidden keyhole height.', failure: 'You have a mud pie. An honest mud pie.' },
      { key: 'B', label: 'Step in the print', dc: 11, success: 'Your boot sinks to a buried keep ring-pull.', failure: 'You are stuck until an Imp tugs you out like a cork.' },
    ],
  },
  {
    prompt: 'A choir of frogs stops when you approach, then one frog wears a tiny crown.',
    options: [
      { key: 'A', label: 'Bow to the monarch', dc: 8, success: 'A croak-decree grants you safe passage through the reed-keep rumor mill.', failure: 'Wrong frog. The real monarch is under a leaf, unimpressed.' },
      { key: 'B', label: 'Ask for a keep rumble', dc: 10, success: 'They drum a rhythm used by keep well-guards to signal all-clear.', failure: 'They only know “Fly, fly, fly.” Catchy. Useless.' },
    ],
  },
  {
    prompt: 'A kite-eating tree has three kites and one banner stuck in it.',
    options: [
      { key: 'A', label: 'Retrieve the banner', dc: 12, success: 'It is a keep campaign flag with a still-readable muster date.', failure: 'The tree also eats hats. You keep yours by retreating.' },
      { key: 'B', label: 'Cut the kites free as tribute', dc: 9, success: 'Kids below cheer and show you a keep mural they painted on a barn.', failure: 'Strings tangle. You become a reluctant maypole.' },
    ],
  },
  {
    prompt: 'A compass needle spins, then points at the youngest Imp.',
    options: [
      { key: 'A', label: 'Ask the Imp to lead', dc: 10, success: 'They wander straight to a keep coal-hatch they “just liked the smell of.”', failure: 'They lead to a puddle. The puddle is not a keep. It is a puddle.' },
      { key: 'B', label: 'Tap the compass', dc: 8, success: 'It settles on a keep-iron deposit under the next hill.', failure: 'It settles on lunch. Fair, but not cartography.' },
    ],
  },
  {
    prompt: 'Hitching posts in a deserted village still have warm saddles.',
    options: [
      { key: 'A', label: 'Call out a greeting', dc: 9, success: 'Riders return from a keep errand and warn you about the east watch.', failure: 'Echo only. The saddles cool while you wait.' },
      { key: 'B', label: 'Hide and watch', dc: 11, success: 'You see them stash a keep key in a flowerpot. You leave it, but now you know.', failure: 'You sneeze. Everyone stares at a bush that is you.' },
    ],
  },
  {
    prompt: 'A mosaic path is missing three tiles. The remaining picture is a keep roof.',
    options: [
      { key: 'A', label: 'Find matching tiles in the grass', dc: 10, success: 'Completed, the mosaic’s chimney aligns with smoke on the real horizon.', failure: 'You find pretty rocks that do not click. Art is pain.' },
      { key: 'B', label: 'Walk only the remaining tiles', dc: 12, success: 'The path is a keep-safe route through a buried spike-bed, now obvious.', failure: 'You hopscotch into nettles. The mosaic judges you.' },
    ],
  },
  {
    prompt: 'A storm cellar door is chained with a lock shaped like a laughing mouth.',
    options: [
      { key: 'A', label: 'Feed it a joke', dc: 11, success: 'It giggles open. Downstairs: keep storm-records and a dry cot.', failure: 'It grimaces. Your joke needs work and so does the lock.' },
      { key: 'B', label: 'Pick the hinge instead', dc: 13, success: 'The chain stays, the door does not. Keep census scrolls wait in the dark.', failure: 'The hinge bites back with a spring. You keep all your fingers, barely.' },
    ],
  },
  {
    prompt: 'Pollen hangs so thick the air looks gilded. Bees ignore you. Something else does not.',
    options: [
      { key: 'A', label: 'Hold your breath and cross', dc: 10, success: 'You glimpse a keep bee-mage’s veil-door in the gold haze.', failure: 'You gasp, sneeze, and invent a new allergy.' },
      { key: 'B', label: 'Wave a wet cloth ahead', dc: 8, success: 'Pollen parts. A keep-shaped hive-box sits on a stump, empty, labelled “home.”', failure: 'The cloth becomes a yellow flag of surrender to spring.' },
    ],
  },
  {
    prompt: 'A child’s chalk hopscotch is drawn to the cliff and then, impossibly, continues on clouds.',
    options: [
      { key: 'A', label: 'Play it', dc: 14, success: 'The last square is solid mist over a keep bartizan. You hop back with a tile-rubbing.', failure: 'You look ridiculous and do not fall, which is the whole victory.' },
      { key: 'B', label: 'Copy the numbers', dc: 9, success: 'They are keep room numbers in hopping order.', failure: 'They are just 1-2-3-4. Childhood remains undefeated.' },
    ],
  },
  {
    prompt: 'A kettle sings on a cold fire. The tea is already poured in two cups.',
    options: [
      { key: 'A', label: 'Sit and wait', dc: 8, success: 'A ranger appears, nods, and slides you a keep trail-permit.', failure: 'Nobody comes. The tea goes bitter. You leave a coin anyway.' },
      { key: 'B', label: 'Drink one cup', dc: 11, success: 'It tastes of mint and iron. A keep dream-map unfolds behind your eyes, briefly copyable.', failure: 'It is river water with ambitions. You are hydrated and unenlightened.' },
    ],
  },
  {
    prompt: 'Bones arranged as a compass rose point one rib toward a hillfort.',
    options: [
      { key: 'A', label: 'Follow the rib', dc: 10, success: 'The hillfort is a keep shell with a still-working well.', failure: 'It points at a cow. A majestic cow. Not a keep.' },
      { key: 'B', label: 'Rebury them respectfully', dc: 7, success: 'Wind thanks you by flattening grass toward the real keep road.', failure: 'You do a good deed. The bones keep their opinions.' },
    ],
  },
  {
    prompt: 'A mirror leans on a tree, showing the path behind you as a keep hallway.',
    options: [
      { key: 'A', label: 'Step sideways around it', dc: 9, success: 'In the corner of the glass you catch a keep door number.', failure: 'You only see yourself looking cautious, which is accurate.' },
      { key: 'B', label: 'Tap the glass', dc: 13, success: 'It ripples. A keep torch-sconce is within arm’s reach, then gone, leaving soot on your glove.', failure: 'It is a normal mirror. The tree appreciates your commitment.' },
    ],
  },
  {
    prompt: 'Goblins have set up a lemonade stand. The pitcher is bubbling.',
    options: [
      { key: 'A', label: 'Buy a cup', dc: 10, success: 'It is surprisingly good. The cup-bottom is a keep stamp.', failure: 'It is vinegar with optimism. You pay for the lesson.' },
      { key: 'B', label: 'Ask for the recipe', dc: 8, success: 'They list “lemons, secrets, keep water.” They point at a spring.', failure: 'Trade secret. They hiss like kettles and honor the brand.' },
    ],
  },
  {
    prompt: 'A landslide whistle sounds, but the mountain is still. The whistle is in your pack.',
    options: [
      { key: 'A', label: 'Find the whistle', dc: 9, success: 'It is a keep storm-alert. Blowing it once makes distant shutters answer.', failure: 'You unpack everything. It was a reed in a cloak hem. Cute.' },
      { key: 'B', label: 'Cover the pack until it stops', dc: 8, success: 'Silence returns. A keep watch-post on the ridge lowers a curious flag.', failure: 'It stops because you sat on it. The mountain remains innocent.' },
    ],
  },
  {
    prompt: 'Two moons are visible. One is the moon. One is a keep window.',
    options: [
      { key: 'A', label: 'Hike toward the false moon', dc: 12, success: 'The window is real, high in a cliff-keep, and a rope of ivy reaches.', failure: 'It was a lantern. Still a nice walk. Still not a moon.' },
      { key: 'B', label: 'Use it as a bearing', dc: 8, success: 'Even if it is a lantern, it marks a keep camp you can approach at dusk.', failure: 'Clouds take both lights. You navigate by grumpiness.' },
    ],
  },
  {
    prompt: 'A polite slime is occupying a boot you took off at the stream.',
    options: [
      { key: 'A', label: 'Negotiate a timeshare', dc: 10, success: 'It leaves a keep-scent trail as rent, glowing faintly toward stone.', failure: 'It does not speak Boot. You pour it out gently. The boot is… fine.' },
      { key: 'B', label: 'Put on the other boot and hop', dc: 7, success: 'Dignity aside, you notice keep-carvings on stream stones you would have missed.', failure: 'You hop into a puddle. The slime applauds, somehow.' },
    ],
  },
  {
    prompt: 'An auctioneer in a clearing is selling “lots of air” to an empty crowd.',
    options: [
      { key: 'A', label: 'Bid one copper', dc: 9, success: 'You win a deed to cubic air above a keep courtyard. The joke is a real easement.', failure: 'You win nothing. The gavel is enthusiastic anyway.' },
      { key: 'B', label: 'Ask what lot 22 is', dc: 11, success: 'Lot 22 is a keep cellar key “misfiled as air.” They sell it cheap to shut you up.', failure: 'Lot 22 is also air. The bit continues.' },
    ],
  },
  {
    prompt: 'Frost ferns on a boulder form a readable floorplan if you squint.',
    options: [
      { key: 'A', label: 'Copy it fast', dc: 10, success: 'Sun hits. You already have the keep west-wing on paper.', failure: 'It melts mid-line. You have a stylish smear.' },
      { key: 'B', label: 'Breathe on it to darken lines', dc: 8, success: 'The keep throne mark appears last, like a signature.', failure: 'Your breath just makes a fog ghost. Cute, not cartography.' },
    ],
  },
  {
    prompt: 'A chain of paper dolls stretches between two trees, each doll a tiny adventurer.',
    options: [
      { key: 'A', label: 'Add a paper Imp', dc: 8, success: 'The chain rustles and points. A keep doll at the end faces a real hill.', failure: 'Your craft is judged. The chain sags with artistic disappointment.' },
      { key: 'B', label: 'Read the names written on the back', dc: 10, success: 'One name matches a keep ledger you will find later, already checked in.', failure: 'The names are doodles. “Sir Blob.” “Keepy.” Close.' },
    ],
  },
  {
    prompt: 'A geyser of feathers erupts from a foxhole, then silence.',
    options: [
      { key: 'A', label: 'Peer in', dc: 11, success: 'It is a keep pillow-store vent. Someone down there has taste and a draft problem.', failure: 'A grouse explodes out. You lose a staring contest with poultry.' },
      { key: 'B', label: 'Collect a feather', dc: 7, success: 'It is fletching from a keep-range arrow, stamped on the quill.', failure: 'It is a goose feather. You look festive.' },
    ],
  },
  {
    prompt: 'Your map blotches. The ink crawls into a new path of its own.',
    options: [
      { key: 'A', label: 'Follow the crawling ink', dc: 13, success: 'It leads to a keep postern the cartographer never admitted existed.', failure: 'It was a bug. A very inky bug. The map is modern art now.' },
      { key: 'B', label: 'Blot and restore the old line', dc: 8, success: 'Discipline keeps you on the known keep road, which is still the right road.', failure: 'You smear north into soup. Compass time.' },
    ],
  },
  {
    prompt: 'A bell without a tower rings once under your feet.',
    options: [
      { key: 'A', label: 'Dig', dc: 12, success: 'A buried keep chapel bell. One more ring and a hatch answers in the nave-dirt.', failure: 'You find a root that sounded hopeful. The forest keeps its jokes.' },
      { key: 'B', label: 'Ring back by stomping', dc: 9, success: 'A pattern answers: keep-watch code for “friends, not wolves.”', failure: 'You just look like you are putting out a tiny fire.' },
    ],
  },
  {
    prompt: 'A line of ants carries crumbs that are actually tiny keep bricks.',
    options: [
      { key: 'A', label: 'Follow the colony', dc: 10, success: 'Their nest is in a cracked keep cornerstone, still inscribed.', failure: 'They go under a log. Ant politics continue without you.' },
      { key: 'B', label: 'Offer a bigger crumb', dc: 8, success: 'Scouts reroute and show you a keep-crumb trail to a pantry ruin.', failure: 'They steal the crumb and your dignity.' },
    ],
  },
  {
    prompt: 'A portrait in a gilt frame hangs on a lone pine. The painted eyes track your Imps.',
    options: [
      { key: 'A', label: 'Ask who they are', dc: 11, success: 'The paint-mouth whispers a keep steward’s name, useful at a later door.', failure: 'It is just a painting. The eyes were a trick of needles.' },
      { key: 'B', label: 'Turn it to face the keep-ridge', dc: 9, success: 'When aligned, a glint on the ridge is a keep spyglass answering.', failure: 'Now it watches a goat. The goat does not care.' },
    ],
  },
  {
    prompt: 'Soap bubbles float uphill. Each reflects a different keep room.',
    options: [
      { key: 'A', label: 'Pop the throne-room bubble', dc: 12, success: 'A soap-slick key-impression stays on your thumb.', failure: 'It pops like any bubble. You smell lemon and regret.' },
      { key: 'B', label: 'Follow them uphill', dc: 10, success: 'They gather at a keep laundry-chute still blowing warm air.', failure: 'Wind takes them. You chase joy, not architecture.' },
    ],
  },
  {
    prompt: 'A hermit crab wears a keep turret as a shell and is in a hurry.',
    options: [
      { key: 'A', label: 'Clear a path', dc: 8, success: 'It scuttles to a tide-pool keep model that matches a real island chart.', failure: 'You help a crab. The crab does not unionize. No map.' },
      { key: 'B', label: 'Sketch the turret', dc: 9, success: 'The crenellations match a mainland keep you are near.', failure: 'It hides. Your sketch is “round thing, legs.”' },
    ],
  },
  {
    prompt: 'Thunder without clouds. The sound is coming from a well-fed gong in a hedge.',
    options: [
      { key: 'A', label: 'Strike it once', dc: 11, success: 'A keep gate far away answers with the same note.', failure: 'Birds explode from the hedge. The gong is just a gong with dreams.' },
      { key: 'B', label: 'Muffle it', dc: 7, success: 'Quiet returns. You find keep-maintenance oil behind the gong, still good.', failure: 'You muffle a beehive’s cousin. It is a gong. You are fine. Jumpy, but fine.' },
    ],
  },
  {
    prompt: 'A snowman wears a keep captain’s hat. The carrot points southwest.',
    options: [
      { key: 'A', label: 'Salute and follow the carrot', dc: 9, success: 'Southwest is a keep palisade half-buried in last year’s drift.', failure: 'The carrot was lunch for a hare. Direction optional.' },
      { key: 'B', label: 'Borrow the hat until the next ridge', dc: 10, success: 'A keep sentry later waves you through, fooled or amused.', failure: 'The snowman looks colder. You put the hat back like a coward with morals.' },
    ],
  },
  {
    prompt: 'Your torch burns green for three heartbeats, then normal again.',
    options: [
      { key: 'A', label: 'Sweep the flame along the ground', dc: 10, success: 'Copper keep-nails in the dirt glow, lining a forgotten causeway.', failure: 'You just look like you are blessing dirt.' },
      { key: 'B', label: 'Snuff and relight', dc: 8, success: 'Second light shows keep-graffiti you missed: an arrow and a joke about stairs.', failure: 'It stays ordinary fire. Mystery over. Walk on.' },
    ],
  },
  {
    prompt: 'A queue of snails is entering a dollhouse. The dollhouse is a perfect keep.',
    options: [
      { key: 'A', label: 'Look through a window', dc: 11, success: 'Furniture layout matches a real keep you will recognize from the foyer.', failure: 'A snail blocks the view, professionally.', },
      { key: 'B', label: 'Tap the gatehouse', dc: 9, success: 'A tiny drawbridge drops. Inside is a real keep signet, snail-polished.', failure: 'The door is glued. Architecture for ants, not you.' },
    ],
  },
  {
    prompt: 'Wind writes in dust: “TRY THE LEFT PASS,” then scuffs it out.',
    options: [
      { key: 'A', label: 'Take the left pass', dc: 10, success: 'It is narrower and opens on a keep postern garden.', failure: 'Left is a dead end with excellent acoustics for sighs.' },
      { key: 'B', label: 'Take the right out of spite', dc: 12, success: 'Spite finds a keep smugglers’ run the wind did not mention.', failure: 'Spite finds brambles. The wind, if it could, would say told you so.' },
    ],
  },
  {
    prompt: 'A festival mask lies in the road, smiling. Putting it on would be a choice.',
    options: [
      { key: 'A', label: 'Wear it to the next bend', dc: 11, success: 'Keep guards in the story-sense of the road salute the mask. You see a side gate.', failure: 'It itches. You are a mysterious stranger with a rash.' },
      { key: 'B', label: 'Hang it on a post for the next fool', dc: 8, success: 'A note was under it: keep curfew hours. You would have missed them.', failure: 'You leave a mask. The road remains a road.' },
    ],
  },
  {
    prompt: 'An echo of mining picks comes from a hill with no mine.',
    options: [
      { key: 'A', label: 'Put an ear to the stone', dc: 10, success: 'Keep masons are working a hidden face. A crack shows banner-cloth.', failure: 'It is your own pulse. You have invented anxiety geology.' },
      { key: 'B', label: 'Knock a greeting pattern', dc: 13, success: 'They knock back keep-mason code for “tea in ten.” A hatch opens.', failure: 'Silence. You look like you are punching a hill.' },
    ],
  },
  {
    prompt: 'A single red door stands in a meadow, frame and all, attached to nothing.',
    options: [
      { key: 'A', label: 'Knock', dc: 9, success: 'A keep butler opens it onto a linen closet that should not be here, and is.', failure: 'Nothing. A cow watches you knock on air-adjacent wood.' },
      { key: 'B', label: 'Walk through without knocking', dc: 14, success: 'You step into a keep scullery and back out with a stamped pantry pass.', failure: 'You walk through a door into more meadow. Philosophy ensues.' },
    ],
  },
  {
    prompt: 'Your party’s footprints behind you are filling with tiny blue flowers.',
    options: [
      { key: 'A', label: 'Retrace and pick one', dc: 8, success: 'The bloom smells like keep cellar-dust. A tracker could follow you to stone.', failure: 'They wilt. Pretty while it lasted.' },
      { key: 'B', label: 'Keep going and don’t look back', dc: 10, success: 'Ahead, the same flowers already outline a keep foundation in the grass.', failure: 'You resist poetry. The path is still the path.' },
    ],
  },
  {
    prompt: 'A goblin traffic warden raises a pebble-sign: STOP. The crossroads is empty.',
    options: [
      { key: 'A', label: 'Stop until they wave you on', dc: 7, success: 'They stamp a keep-day pass into your map margin, very official, slightly sticky.', failure: 'They forget you exist. You wait, then go, slightly more law-abiding.' },
      { key: 'B', label: 'Jaywalk with purpose', dc: 12, success: 'They blow a whistle that is also a keep all-clear. Useful later.', failure: 'A pebble-ticket. You are fined one berry. Justice is served.' },
    ],
  },
  {
    prompt: 'The last light catches a weathervane on a distant keep—and it turns to face you.',
    options: [
      { key: 'A', label: 'Wave', dc: 8, success: 'It dips. A shutter opens. Someone knows you are coming.', failure: 'It is the wind. You have waved at architecture. Carry on.' },
      { key: 'B', label: 'Take a bearing and hurry', dc: 10, success: 'You reach the ridge before dusk and see the keep gate still unbarred.', failure: 'You hurry into a sheepfold. The weathervane keeps its secrets a little longer.' },
    ],
  },
  {
    prompt: 'A travelling dentist offers to check “trap teeth” for free. Their pliers are huge.',
    options: [
      { key: 'A', label: 'Let them look', dc: 9, success: 'They find no traps, then gift a keep molar-charm that rattles near hidden doors.', failure: 'They find popcorn. You leave with minty shame and no loot.' },
      { key: 'B', label: 'Ask about dungeon dentistry', dc: 11, success: 'They describe a keep well where coins are thrown for luck—and where they fish them.', failure: 'They only want to talk floss. You escape mid-lecture.' },
    ],
  },
  {
    prompt: 'Your Imps freeze. A parade of silent deer is wearing keep livery, bells muffled.',
    options: [
      { key: 'A', label: 'Step aside and bow', dc: 8, success: 'The lead stag dips a rack toward a keep bridle-path you had missed.', failure: 'They pass like fog. Beautiful. No directions.' },
      { key: 'B', label: 'Fall in at the back', dc: 13, success: 'The column ends at a keep stable-yard still used by someone careful.', failure: 'A deer looks back. You are not on the guest list. You peel off into ferns.' },
    ],
  },
];

export const ADVENTURE_ENCOUNTER_DCS = ADVENTURE_ENCOUNTERS.map((encounter) => ({
  options: encounter.options.map((option) => ({ key: option.key, dc: option.dc })),
}));
