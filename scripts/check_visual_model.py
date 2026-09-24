"""Real-model smoke check: no catalogue writes and no outbound network calls.

This proves the inference pipeline, not accuracy on real shop products.
"""
import json
import os
from pathlib import Path
import sys
import time
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'alamaan_backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

import numpy as np
from PIL import Image, ImageDraw
from apps.products.visual_search import embed

image = Image.new('RGB', (640, 480), 'white')
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((120, 170, 520, 340), radius=20, fill='#202d40')
draw.line((170, 190, 140, 60), fill='#202d40', width=12)
draw.line((470, 190, 500, 60), fill='#202d40', width=12)
for x in range(175, 470, 35):
    draw.rectangle((x, 280, x + 20, 300), fill='#56bb82')

started = time.monotonic()
with patch('socket.socket.connect', side_effect=AssertionError('Inference must not use the network')):
    first = embed(image)
    second = embed(image.copy())
assert first.shape == (512,)
assert np.isfinite(first).all()
assert abs(float(np.linalg.norm(first)) - 1) < 1e-5
assert float(first @ second) > 0.999
print(json.dumps({'real_model': True, 'dimensions': len(first), 'self_similarity': float(first @ second),
                  'two_inferences_seconds': round(time.monotonic() - started, 3), 'network_blocked': True}))
