import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional

POS_TAGS = {
    "greeting", "pronoun", "verb", "adjective", "noun",
    "phrase", "number", "letter", "unknown",
}
PERSONS = {"I", "you", "he", "she", "we", "they", "it"}


@dataclass(frozen=True)
class Entry:
    label: str                      # recognizer label, e.g. "THUMBS_UP"
    text: str                       # how it reads in English, e.g. "good"
    pos: str                        # one of POS_TAGS
    person: Optional[str] = None    # pronouns only
    repeatable: bool = False        # True: an immediate repeat is meaningful, don't collapse it


class Lexicon:
    """Maps recognizer labels to words and word types. Data lives in lexicon.json."""

    def __init__(self, entries: Dict[str, Entry], language: str = ""):
        self._entries = entries
        self.language = language

    def get(self, label: str) -> Entry:
        entry = self._entries.get(label)
        if entry is not None:
            return entry
        # Never drop an unknown sign: fall back to its own name.
        return Entry(label=label, text=label.lower().replace("_", " "), pos="unknown")

    def text(self, label: str) -> str:
        return self.get(label).text

    def __contains__(self, label: str) -> bool:
        return label in self._entries

    def __len__(self) -> int:
        return len(self._entries)

    @classmethod
    def from_dict(cls, data: dict) -> "Lexicon":
        raw = data.get("entries")
        if not isinstance(raw, dict) or not raw:
            raise ValueError("lexicon needs a non-empty 'entries' object")
        entries: Dict[str, Entry] = {}
        for label, e in raw.items():
            if not isinstance(e, dict):
                raise ValueError(f"{label}: entry must be an object")
            text, pos = e.get("text"), e.get("pos")
            if not isinstance(text, str) or not text.strip():
                raise ValueError(f"{label}: 'text' must be a non-empty string")
            if pos not in POS_TAGS:
                raise ValueError(f"{label}: 'pos' must be one of {sorted(POS_TAGS)}")
            person = e.get("person")
            if pos == "pronoun":
                if person not in PERSONS:
                    raise ValueError(f"{label}: pronoun needs 'person' in {sorted(PERSONS)}")
            elif person is not None:
                raise ValueError(f"{label}: 'person' is only valid for pronouns")
            entries[label] = Entry(
                label=label,
                text=text.strip(),
                pos=pos,
                person=person,
                repeatable=bool(e.get("repeatable", False)),
            )
        return cls(entries, language=str(data.get("language", "")))

    @classmethod
    def load(cls, path: Optional[Path] = None) -> "Lexicon":
        path = Path(path) if path else Path(__file__).with_name("lexicon.json")
        with open(path, encoding="utf-8") as f:
            return cls.from_dict(json.load(f))