"""Renders the app's sound effects (wooden piece sounds + soft chimes) into ../sounds/.
Run:  python dev/make_sounds.py   (needs numpy + scipy; ffmpeg for the mp3 chimes)"""
import os, subprocess, wave
import numpy as np
from scipy.signal import butter, sosfilt

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', 'sounds')
os.makedirs(OUT, exist_ok=True)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype='band', fs=SR, output='sos'), x)


def lp(x, hi, order=2):
    return sosfilt(butter(order, hi, btype='low', fs=SR, output='sos'), x)


def env_t(n):
    return np.arange(n) / SR


def tock(pitch=1.0, bright=1.0, body=1.0, dur=0.16, seed=1, decay=1.0):
    """A wooden piece set down on a wooden board: short click, resonant 'tok' of the piece, low thud of the board."""
    rng = np.random.default_rng(seed)
    t = env_t(int(SR * dur))
    y = np.zeros_like(t)
    # piece resonances (wood block-like, inharmonic)
    modes = [(760, 1.0, 0.026), (1210, 0.62, 0.016), (1980, 0.40, 0.009), (2930, 0.24, 0.006), (4300, 0.12, 0.004)]
    for f, a, tau in modes:
        f *= pitch * rng.uniform(0.985, 1.015)
        y += a * np.exp(-t / (tau * decay)) * np.sin(2 * np.pi * f * t + rng.uniform(0, 2 * np.pi))
    # board body thud
    y += body * 0.42 * np.exp(-t / 0.011) * np.sin(2 * np.pi * 185 * pitch * t)
    y += body * 0.18 * np.exp(-t / 0.016) * np.sin(2 * np.pi * 120 * t)
    # contact click
    n = rng.standard_normal(len(t)) * np.exp(-t / 0.0012)
    y += bright * 1.1 * bp(n, 1800, 9000)
    # very short attack ramp so there is no digital pop
    ramp = np.minimum(1, t / 0.0004)
    y *= ramp
    return y


def knock(pitch=1.0, seed=3):
    """Piece hitting piece: brighter, harder, shorter."""
    rng = np.random.default_rng(seed)
    t = env_t(int(SR * 0.12))
    y = np.zeros_like(t)
    for f, a, tau in [(1450, 1.0, 0.010), (2320, 0.7, 0.007), (3650, 0.45, 0.005), (5100, 0.25, 0.003)]:
        y += a * np.exp(-t / tau) * np.sin(2 * np.pi * f * pitch * t + rng.uniform(0, 6.28))
    n = rng.standard_normal(len(t)) * np.exp(-t / 0.0009)
    y += 1.3 * bp(n, 2500, 11000)
    return y * np.minimum(1, t / 0.0003)


def tone(freq, dur, kind='marimba', amp=1.0):
    t = env_t(int(SR * dur))
    if kind == 'marimba':
        parts = [(1, 1.0, 0.45), (4.0, 0.22, 0.09), (9.9, 0.06, 0.035)]
    elif kind == 'bell':
        parts = [(1, 1.0, 0.7), (2.0, 0.35, 0.35), (2.76, 0.25, 0.25), (5.4, 0.1, 0.1)]
    else:  # soft
        parts = [(1, 1.0, 0.3), (2, 0.12, 0.12)]
    y = sum(a * np.exp(-t / d) * np.sin(2 * np.pi * freq * r * t) for r, a, d in parts)
    y *= np.minimum(1, t / 0.004)
    return amp * y


def mix(*items, length=None):
    """items: (signal, start_seconds, gain)"""
    end = max(int(s * SR) + len(x) for x, s, g in items)
    if length:
        end = max(end, int(length * SR))
    y = np.zeros(end)
    for x, s, g in items:
        i = int(s * SR)
        y[i:i + len(x)] += g * x
    return y


def finish(y, peak=0.7, tail=0.01):
    fade = min(len(y), int(SR * 0.04))
    y = y.copy(); y[-fade:] *= np.linspace(1, 0, fade) ** 2
    y = np.concatenate([y, np.zeros(int(SR * tail))])
    y = sosfilt(butter(2, 90, btype='high', fs=SR, output='sos'), lp(y, 14000))
    return y / (np.max(np.abs(y)) + 1e-9) * peak


def write_wav(name, y):
    path = os.path.join(OUT, name + '.wav')
    data = (np.clip(y, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(data.tobytes())
    return path


def write_mp3(name, y):
    wav = write_wav(name + '_tmp', y)
    mp3 = os.path.join(OUT, name + '.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '96k', mp3], check=True)
    os.remove(wav)


N = {'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'G5': 783.99, 'A5': 880.0, 'B5': 987.77,
     'C6': 1046.5, 'D6': 1174.66, 'E6': 1318.5, 'G6': 1568.0, 'A6': 1760.0, 'C7': 2093.0}

# --- piece sounds (wav: no decoder delay) ---
write_wav('move', finish(tock(1.0, seed=1), 0.72))
write_wav('move2', finish(tock(1.03, seed=7, bright=0.9), 0.72))
write_wav('move-opp', finish(tock(0.88, bright=0.75, body=1.15, seed=2), 0.66))
write_wav('capture', finish(mix((knock(1.0), 0, 0.85), (tock(0.95, bright=1.2, body=1.2, seed=4), 0.022, 1.0)), 0.8))
write_wav('castle', finish(mix((tock(1.0, seed=5), 0, 1.0), (tock(0.9, seed=6, bright=0.8), 0.13, 0.9)), 0.72))
check_ring = mix((tone(2350, 0.25, 'bell', 0.25), 0, 1), (tone(3120, 0.18, 'bell', 0.12), 0, 1))
write_wav('check', finish(mix((tock(1.08, bright=1.35, seed=8), 0, 1.0), (check_ring, 0.006, 1.0)), 0.75))
write_wav('illegal', finish(mix((tock(0.5, bright=0.2, body=1.3, seed=9, decay=0.7), 0, 1.0), (tock(0.45, bright=0.15, body=1.3, seed=10, decay=0.7), 0.09, 0.8)), 0.55))
write_wav('promote', finish(mix((tock(1.0, seed=11), 0, 1.0), (tone(N['E6'], 0.5, 'marimba'), 0.05, 0.35), (tone(N['A6'], 0.6, 'marimba'), 0.14, 0.35)), 0.72))
# --- chimes (mp3) ---
write_mp3('start', finish(mix((tone(N['G5'], 0.7), 0, 0.8), (tone(N['C6'], 0.9), 0.12, 0.8)), 0.55, 0.05))
write_mp3('win', finish(mix(*[(tone(N[n], 1.0, 'bell'), i * 0.11, 0.7) for i, n in enumerate(['C6', 'E6', 'G6', 'C7'])]), 0.55, 0.05))
write_mp3('lose', finish(mix(*[(tone(N[n], 1.1, 'marimba'), i * 0.17, 0.8) for i, n in enumerate(['G5', 'E5', 'C5'])]), 0.55, 0.05))
write_mp3('draw', finish(mix((tone(N['E5'], 0.8), 0, 0.8), (tone(N['E5'], 0.9), 0.18, 0.7)), 0.5, 0.05))
write_mp3('correct', finish(mix((tone(N['E6'], 0.45, 'bell'), 0, 0.7), (tone(N['A6'], 0.6, 'bell'), 0.09, 0.7)), 0.5, 0.05))
write_mp3('brilliant', finish(mix(*[(tone(N[n], 0.9, 'bell'), i * 0.06, 0.6) for i, n in enumerate(['C6', 'E6', 'G6', 'C7', 'E6', 'G6'])]), 0.55, 0.05))
write_mp3('notify', finish(tone(N['A5'], 0.5, 'marimba'), 0.45, 0.05))
write_mp3('wrong', finish(mix((tone(311.1, 0.35, 'soft'), 0, 0.8), (tone(277.2, 0.45, 'soft'), 0.12, 0.8)), 0.45, 0.05))
print('done')
