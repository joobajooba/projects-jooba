"""Cell bit flags for the dungeon grid."""

NOTHING = 0x00000000
BLOCKED = 0x00000001
ROOM = 0x00000002
CORRIDOR = 0x00000004
PERIMETER = 0x00000010
ENTRANCE = 0x00000020
ROOM_ID = 0x0000FFC0

ARCH = 0x00010000
DOOR = 0x00020000
LOCKED = 0x00040000
TRAPPED = 0x00080000
SECRET = 0x00100000
PORTC = 0x00200000
STAIR_DN = 0x00400000
STAIR_UP = 0x00800000
LABEL = 0xFF000000

OPENSPACE = ROOM | CORRIDOR
DOORSPACE = ARCH | DOOR | LOCKED | TRAPPED | SECRET | PORTC
ESPACE = ENTRANCE | DOORSPACE | LABEL
STAIRS = STAIR_DN | STAIR_UP

DI = {"north": -1, "south": 1, "west": 0, "east": 0}
DJ = {"north": 0, "south": 0, "west": -1, "east": 1}
DIRS = ("north", "south", "west", "east")
OPPOSITE = {
    "north": "south",
    "south": "north",
    "west": "east",
    "east": "west",
}
