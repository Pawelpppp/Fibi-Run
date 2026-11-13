# ArekRun

Prosta gra 2D w stylu retro lat 90. (16-bit pixel art).

Główny bohater (Arek w zbroi płytowej z mieczem) biegnie w prawo i porywa przeciwników.

## Grafiki

### Sprites (do animacji biegu/skoku/ataku)
W folderze `assets/sprites/`:
- `idle_front.png` / `idle_side.png` – stanie
- `run_1.png`, `run_2.png`, `run_3.png` – cykl biegu
- `jump.png` – skok
- `attack.png` – atak
- `front_full.png` – pełna postać od frontu

### Portrety (do dialogów)
W folderze `assets/portraits/`:
- `dialogue_portrait.png` – portret w zbroi do rozmów
- `face_portrait.png` – twarz od frontu

Wszystkie grafiki mają transparentne tło (checkerboard w podglądzie) i są w stylu SNES / early 90s.

## Następne kroki
- Dodać silnik gry (np. Phaser, Godot, Unity 2D)
- Zaimplementować ruch w prawo, skoki, kolizje i mechanikę porywania przeciwników
- Dodać przeciwników, tła, UI

Projekt stworzony w stylu inspirowanym Mustache Protocol (Henry Cavill).
