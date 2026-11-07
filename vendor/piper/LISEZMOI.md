# Moteur des voix naturelles (Piper)

Fichiers tiers, utilisés sans modification par `js/piper-worker.js` :

| Fichier | Projet | Licence | Source |
|---|---|---|---|
| ort.wasm.min.js, ort-wasm-simd.wasm | onnxruntime-web 1.18.0 (Microsoft) | MIT (LICENSE-onnxruntime.txt) | https://github.com/microsoft/onnxruntime |
| piper_phonemize.js / .wasm / .data | @diffusionstudio/piper-wasm 1.0.0, compilation de piper-phonemize + espeak-ng | MIT (piper-wasm), GPL-3.0 (espeak-ng) | https://github.com/diffusionstudio/piper-wasm, https://github.com/espeak-ng/espeak-ng |

Les voix (fr_FR-siwis-medium, en_US-ryan-high) ne sont pas dans ce dépôt : elles sont téléchargées depuis
https://huggingface.co/rhasspy/piper-voices au premier usage (voir les fiches MODEL_CARD de chaque voix pour leur licence).
