import json
from pathlib import Path
from typing import List, Optional, Tuple


class Phrases:
    """Fixed sentences for sign sequences: "HELLO then OK" -> "Hello, how are you?".

    The data lives in phrases.json, so adding a sentence needs no code. The longest matching
    sequence wins, so a three-sign phrase beats the two-sign phrase it starts with.
    """

    def __init__(self, entries: List[Tuple[Tuple[str, ...], str]]):
        seen = set()
        for signs, sentence in entries:
            if not signs or not sentence.strip():
                raise ValueError("a phrase needs at least one sign and a sentence")
            if signs in seen:
                raise ValueError(f"phrase defined twice: {list(signs)}")
            seen.add(signs)
        self._entries = sorted(entries, key=lambda e: -len(e[0]))  # longest first

    def __len__(self) -> int:
        return len(self._entries)

    def match_at(self, labels: List[str], start: int) -> Optional[Tuple[int, str]]:
        """The longest phrase that starts at labels[start]: (number of signs it uses, sentence), or None."""
        for signs, sentence in self._entries:
            n = len(signs)
            if tuple(labels[start:start + n]) == signs:
                return n, sentence
        return None

    @classmethod
    def from_dict(cls, data: dict) -> "Phrases":
        raw = data.get("phrases")
        if not isinstance(raw, list):
            raise ValueError("phrases.json needs a 'phrases' list")
        entries = []
        for i, p in enumerate(raw):
            signs, sentence = p.get("signs"), p.get("sentence")
            if not (isinstance(signs, list) and signs and all(isinstance(s, str) and s for s in signs)):
                raise ValueError(f"phrase {i}: 'signs' must be a non-empty list of sign names")
            if not isinstance(sentence, str) or not sentence.strip():
                raise ValueError(f"phrase {i}: 'sentence' must be a non-empty string")
            entries.append((tuple(signs), sentence.strip()))
        return cls(entries)

    @classmethod
    def load(cls, path: Optional[Path] = None) -> "Phrases":
        path = Path(path) if path else Path(__file__).with_name("phrases.json")
        if not path.exists():
            return cls([])
        with open(path, encoding="utf-8") as f:
            return cls.from_dict(json.load(f))