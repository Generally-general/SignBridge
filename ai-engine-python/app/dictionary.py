GESTURE_MAP = {
    "OK": "okay",
    "I_LOVE_YOU": "I love you",
    "ROCK": "rock on",
    "THUMBS_UP": "good",
    "CALL_ME": "call me",
    "SPIDERMAN": "spiderman",
    "L_OR_GUN": "L",
    "PEACE": "peace",
    "LETTER_R": "R",
    "THREE": "three",
    "FOUR": "four",
    "HELLO": "hello",
    "ONE": "one",
    "LETTER_I": "I",
    "FIST": "stop",
}


def to_display_word(gesture_name):
    return GESTURE_MAP.get(gesture_name, gesture_name.lower())