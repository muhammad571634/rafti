"""Builds Rafti's own wake-up melodies (assets/sounds/alarms/*.wav): soft bell-like tones
made from sine partials, no samples and no licensed music. Each file is a seamless loop of
about 8 seconds; the app loops it while an alarm rings. Run: python scripts/build-alarm-sounds.py
"""
import math
import os
import struct
import wave

RATE = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds', 'alarms')

# Note frequencies (Hz).
N = {'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.0, 'B5': 987.77,
     'C6': 1046.5, 'D6': 1174.66, 'E6': 1318.51, 'G4': 392.0, 'A4': 440.0, 'E4': 329.63, 'C4': 261.63}


def bell(freq, t, decay):
    """A bell: a few inharmonic partials that fade out."""
    env = math.exp(-t * decay)
    return env * (math.sin(2 * math.pi * freq * t) * 0.6
                  + math.sin(2 * math.pi * freq * 2.01 * t) * 0.25
                  + math.sin(2 * math.pi * freq * 3.02 * t) * 0.1)


def render(notes, length, decay=3.0, gain=0.5):
    """notes: (start seconds, note name). Returns 16-bit samples for `length` seconds."""
    total = int(RATE * length)
    buf = [0.0] * total
    for start, name in notes:
        f = N[name]
        s0 = int(start * RATE)
        for i in range(int(RATE * 2.5)):
            j = (s0 + i) % total  # wrap so the loop is seamless
            buf[j] += bell(f, i / RATE, decay)
    peak = max(abs(x) for x in buf) or 1.0
    return [int(max(-1, min(1, x / peak * gain)) * 32767) for x in buf]


def write(name, samples):
    path = os.path.join(OUT, f'{name}.wav')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b''.join(struct.pack('<h', s) for s in samples))
    print(path)


def arp(seq, step, length):
    return [(i * step, n) for i, n in enumerate(seq) if i * step < length]


os.makedirs(OUT, exist_ok=True)
# Morning Tide: a slow rising arpeggio, like small waves.
write('morning-tide', render(arp(['C5', 'E5', 'G5', 'C6', 'G5', 'E5', 'D5', 'G5'] * 2, 0.5, 8), 8, decay=2.2))
# Shell Chimes: quick high chimes in pairs.
write('shell-chimes', render(arp(['E6', 'C6', 'D6', 'G5', 'E6', 'C6', 'A5', 'G5'] * 2, 0.5, 8), 8, decay=4.0))
# Sea Breeze: wide, slow notes.
write('sea-breeze', render([(0, 'G4'), (1, 'D5'), (2, 'G5'), (3.5, 'E5'), (4, 'A4'), (5, 'E5'), (6, 'A5'), (7.2, 'C5')], 8, decay=1.4))
# Soft Bells: two-note bell, gentle.
write('soft-bells', render(arp(['A5', 'E5'] * 8, 0.5, 8), 8, decay=2.8, gain=0.45))
# Lighthouse: a clear repeating three-note call, the loudest.
write('lighthouse', render(arp(['C6', 'C6', 'G5', 'G5'] * 4, 0.5, 8), 8, decay=5.0, gain=0.6))
