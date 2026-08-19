"""32-bit Mulberry32, matching api/lib/dungeonTraits.js."""

from __future__ import annotations


def to_u32(value: int) -> int:
    return value & 0xFFFFFFFF


class Mulberry32:
    def __init__(self, seed: int) -> None:
        self.a = to_u32(seed)

    def random(self) -> float:
        a = to_u32(self.a + 0x6D2B79F5)
        self.a = a
        t = to_u32((a ^ (a >> 15)) * (1 | a))
        t = to_u32(t + to_u32((t ^ (t >> 7)) * (61 | t))) ^ t
        return to_u32(t ^ (t >> 14)) / 4294967296.0

    def randrange(self, start: int, stop: int | None = None) -> int:
        if stop is None:
            if start <= 0:
                raise ValueError("empty range")
            return int(self.random() * start)
        span = stop - start
        if span <= 0:
            raise ValueError("empty range")
        return start + int(self.random() * span)

    def randint(self, low: int, high: int) -> int:
        return low + self.randrange(high - low + 1)

    def choice(self, seq):
        return seq[self.randrange(len(seq))]

    def shuffle(self, items: list) -> None:
        for index in range(len(items) - 1, 0, -1):
            swap = self.randrange(index + 1)
            items[index], items[swap] = items[swap], items[index]
