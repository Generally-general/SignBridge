SUBJECTS = {"I", "YOU", "HE", "SHE", "WE", "THEY"}

BE_VERBS = {
    "I": "am",
    "YOU": "are",
    "HE": "is",
    "SHE": "is",
    "WE": "are",
    "THEY": "are",
}

TIME_WORDS = {"TODAY", "TOMORROW", "YESTERDAY", "NOW"}


def correct_grammar(words):
    """
    Minimal rule-based reordering for ISL-style gloss sequences
    (e.g. ["I", "HOME", "GO"] -> "I am going home").
    Not a trained model - intentionally simple and dependency-free.
    """
    if not words:
        return ""

    words = [w.upper() for w in words]

    time_words = [w for w in words if w in TIME_WORDS]
    core = [w for w in words if w not in TIME_WORDS]

    subject = None
    rest = core
    if core and core[0] in SUBJECTS:
        subject = core[0]
        rest = core[1:]

    if subject and rest:
        be_verb = BE_VERBS.get(subject, "is")
        sentence_words = [subject.capitalize(), be_verb] + [w.lower() for w in rest]
    else:
        sentence_words = [w.lower() for w in core]

    if time_words:
        sentence_words = [w.lower() for w in time_words] + sentence_words

    sentence = " ".join(sentence_words)
    return sentence[0].upper() + sentence[1:] if sentence else sentence