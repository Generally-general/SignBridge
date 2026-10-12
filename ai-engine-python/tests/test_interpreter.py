import random

from app.engine.config import EngineConfig
from app.engine.interpreter import Interpreter
from app.engine.lexicon import Lexicon
from app.engine.utterance import SignedWord

LEX = Lexicon.load()


def sw(label, conf=1.0):
    return SignedWord(label=label, word=LEX.text(label), confidence=conf, t_ms=0.0)


def interp(labels, final=True, cfg=None):
    return Interpreter(LEX, cfg or EngineConfig()).interpret([sw(l) for l in labels], final=final)


def test_empty_input_gives_empty_sentence():
    assert interp([]).sentence == ""


def test_single_greeting_is_an_exclamation_when_final():
    assert interp(["HELLO"]).sentence == "Hello!"


def test_interim_text_has_no_terminal_punctuation():
    assert interp(["HELLO", "THUMBS_UP"], final=False).sentence == "Hello, good"


def test_greeting_followed_by_words_gets_a_comma_and_a_full_stop():
    assert interp(["HELLO", "FOUR"]).sentence == "Hello, four."


def test_pronoun_plus_adjective_becomes_a_be_sentence():
    assert interp(["LETTER_I", "THUMBS_UP"]).sentence == "I am good."
    assert interp(["LETTER_I", "OK"]).sentence == "I am okay."


def test_pronoun_without_adjective_is_left_alone():
    assert interp(["LETTER_I", "FIST"]).sentence == "I stop."


def test_immediate_repeat_is_collapsed():
    assert interp(["HELLO", "HELLO", "FOUR"]).sentence == "Hello, four."
    assert interp(["FIST", "FIST"]).sentence == "Stop."


def test_non_adjacent_repeat_is_kept():
    assert interp(["ONE", "FOUR", "ONE"]).sentence == "One four one."


def test_collapse_can_be_turned_off():
    cfg = EngineConfig(collapse_repeats=False)
    assert interp(["FIST", "FIST"], cfg=cfg).sentence == "Stop stop."


def test_phrase_signs_keep_their_own_casing():
    assert interp(["I_LOVE_YOU"]).sentence == "I love you."


def test_unknown_label_survives_into_the_sentence():
    out = Interpreter(LEX).interpret(
        [SignedWord("BRAND_NEW", "brand new", 1.0, 0.0)], final=True
    )
    assert out.sentence == "Brand new."


def test_low_confidence_signs_are_reported_not_altered():
    out = Interpreter(LEX, EngineConfig(uncertain_below=0.8)).interpret(
        [sw("HELLO", 0.95), sw("FOUR", 0.72)], final=True
    )
    assert out.uncertain == ["four"]
    assert out.sentence == "Hello, four."


def test_meaning_is_preserved_for_random_sequences():
    """Every recognized word must appear in the output unless it is an immediate repeat."""
    rng = random.Random(0)
    labels = [l for l in ["HELLO", "OK", "THUMBS_UP", "CALL_ME", "ROCK", "PEACE", "ONE", "THREE", "FOUR", "FIST"]]
    for _ in range(300):
        seq = [rng.choice(labels) for _ in range(rng.randint(1, 8))]
        out = interp(seq).sentence.lower()
        for i, label in enumerate(seq):
            if i > 0 and seq[i - 1] == label:
                continue
            assert LEX.text(label).lower() in out, (seq, out)