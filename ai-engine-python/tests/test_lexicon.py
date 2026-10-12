import pytest

from app.engine.lexicon import Lexicon


def test_default_lexicon_loads_and_covers_every_label_the_recognizer_can_return():
    lex = Lexicon.load()
    for label in [
        "OK", "I_LOVE_YOU", "ROCK", "THUMBS_UP", "CALL_ME", "SPIDERMAN", "L_OR_GUN",
        "PEACE", "LETTER_R", "THREE", "FOUR", "HELLO", "ONE", "LETTER_I", "FIST",
    ]:
        assert label in lex, label


def test_unknown_label_is_kept_not_dropped():
    e = Lexicon.load().get("SOME_NEW_SIGN")
    assert e.text == "some new sign" and e.pos == "unknown"


@pytest.mark.parametrize(
    "bad",
    [
        {},
        {"entries": {}},
        {"entries": {"X": "hello"}},
        {"entries": {"X": {"text": "", "pos": "noun"}}},
        {"entries": {"X": {"text": "a", "pos": "weird"}}},
        {"entries": {"X": {"text": "I", "pos": "pronoun"}}},
        {"entries": {"X": {"text": "a", "pos": "noun", "person": "I"}}},
    ],
)
def test_invalid_lexicons_are_rejected(bad):
    with pytest.raises(ValueError):
        Lexicon.from_dict(bad)