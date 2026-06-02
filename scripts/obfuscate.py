#!/usr/bin/env python3
"""
Obfuscate questions for client-side delivery.
Produces: questions.bin (raw XOR-encrypted bytes) + key.json (build-time key, NOT committed)
Runtime: app fetches questions.bin, decrypts with embedded key.
Security: obfuscation only (no auth = no real secrecy), but casual users won't read it.
"""
import json, os, sys

INPUT = '/home/bjack/mcqapp-v2/src/lib/data/questions.json'
OUT_BIN = '/home/bjack/mcqapp-v2/static/questions.bin'
OUT_KEY = '/home/bjack/mcqapp-v2/static/key.json'

KEY = int.from_bytes(os.urandom(1), 'big')

def xor_bytes(data, key):
    return bytes(b ^ key for b in data)

def main():
    with open(INPUT, 'r', encoding='utf-8') as f:
        questions = json.load(f)

    payload = json.dumps(questions, separators=(',', ':')).encode('utf-8')
    encrypted = xor_bytes(payload, KEY)

    with open(OUT_BIN, 'wb') as f:
        f.write(encrypted)

    with open(OUT_KEY, 'w') as f:
        json.dump({'key': KEY, 'count': len(questions)}, f)

    print(f'Wrote {len(questions)} questions:')
    print(f'  {OUT_BIN}  ({len(encrypted)} bytes)')
    print(f'  {OUT_KEY}  (key={KEY})')
    print(f'Build-time step: inject key={KEY} into app source before build')

if __name__ == '__main__':
    main()
