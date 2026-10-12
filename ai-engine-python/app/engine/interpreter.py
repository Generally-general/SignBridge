from dataclasses import dataclass
from typing import List, Optional

from .config import EngineConfig
from .lexicon import Lexicon
from .phrases import Phrases
from .utterance import SignedWord

BE_VERB = {"I": "am", "you": "are", "he": "is", "she": "is", "we": "are", "they": "are", "it": "is"}


@dataclass
class Token:
    label: str
    text: str
    pos: str
    confidence: float
    person: Optional[str] = None
    repeatable: bool = False
    count: int = 1


@dataclass
class Interpretation:
    sentence: str
    tokens: List[Token]
    uncertain: List[str]


class Interpreter:
    """Recognized signs -> English, in explicit stages.

    1. lookup            label -> lexicon entry (unknown labels are kept, never dropped)
    2. collapse repeats  an immediate repeat of the same sign reads as one word
    3. rules             pronoun + adjective -> "I am good"
    4. realize           comma after a leading greeting, capital letter, punctuation

    Deterministic: no model is involved, and no content word is added or removed
    except by the explicit repeat-collapse stage.
    """

    def __init__(self, lexicon: Lexicon, cfg: Optional[EngineConfig] = None, phrases: Optional[Phrases] = None):
        self.lexicon = lexicon
        self.cfg = cfg or EngineConfig()
        self.phrases = phrases if phrases is not None else Phrases([])

    # ---- stages ---------------------------------------------------------
    def _lookup(self, words: List[SignedWord]) -> List[Token]:
        tokens = []
        for w in words:
            e = self.lexicon.get(w.label)
            tokens.append(
                Token(
                    label=w.label,
                    text=e.text,
                    pos=e.pos,
                    confidence=w.confidence,
                    person=e.person,
                    repeatable=e.repeatable,
                )
            )
        return tokens

    def _collapse_repeats(self, tokens: List[Token]) -> List[Token]:
        out: List[Token] = []
        for t in tokens:
            prev = out[-1] if out else None
            if prev is not None and prev.label == t.label and not t.repeatable:
                prev.count += 1
                prev.confidence = min(prev.confidence, t.confidence)
            else:
                out.append(t)
        return out
      
    def _apply_phrases(self, tokens: List[Token]) -> List[Token]:
        """Replace sign sequences that have a fixed sentence (phrases.json) by that sentence."""
        labels = [t.label for t in tokens]
        out: List[Token] = []
        i = 0
        while i < len(tokens):
            hit = self.phrases.match_at(labels, i)
            if hit is None:
                out.append(tokens[i])
                i += 1
                continue
            n, sentence = hit
            chunk = tokens[i:i + n]
            out.append(
                Token(
                    label="+".join(t.label for t in chunk),
                    text=sentence,
                    pos="phrase",
                    confidence=min(t.confidence for t in chunk),
                    repeatable=True,
                )
            )
            i += n
        return out

    def _rules(self, tokens: List[Token]) -> List[str]:
        pieces: List[str] = []
        i = 0
        while i < len(tokens):
            t = tokens[i]
            nxt = tokens[i + 1] if i + 1 < len(tokens) else None
            if (
                t.pos == "pronoun"
                and t.person
                and nxt is not None
                and nxt.pos == "adjective"
            ):
                pieces += [t.text, BE_VERB[t.person], nxt.text]
                i += 2
                continue
            pieces.append(t.text)
            i += 1
        return pieces

    def _realize(self, pieces: List[str], tokens: List[Token], final: bool) -> str:
        if not pieces:
            return ""
        out = list(pieces)
        if tokens and tokens[0].pos == "greeting" and len(out) > 1:
            out[0] = out[0] + ","
        sentence = " ".join(out)
        sentence = sentence[0].upper() + sentence[1:]
        if final and sentence[-1] not in ".!?":
            greeting_only = len(tokens) == 1 and tokens[0].pos == "greeting"
            sentence += "!" if greeting_only else "."
        return sentence

    # ---- entry point ----------------------------------------------------
    def interpret(self, words: List[SignedWord], final: bool = False) -> Interpretation:
        tokens = self._lookup(words)
        if self.cfg.collapse_repeats:
            tokens = self._collapse_repeats(tokens)
        tokens = self._apply_phrases(tokens)
        pieces = self._rules(tokens)
        sentence = self._realize(pieces, tokens, final)
        uncertain = [w.word for w in words if w.confidence < self.cfg.uncertain_below]
        return Interpretation(sentence=sentence, tokens=tokens, uncertain=uncertain)
