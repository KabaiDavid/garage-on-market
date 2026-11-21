#!/usr/bin/env bash
# Hero background video — the ORIGINAL hero edit, re-encoded in a single generation
# from the restaurant's own brand video (1280x720, 29.97 fps: the highest resolution published).
#   Usage: scripts/build_hero_video.sh path/to/original.mp4
#
# The edit (shots, order, timing) is exactly the hero loop the site launched with:
# ember pizza → bar → cheers → cocktail build → oven + fire → dough + chef → whiskey pour.
# Quality fixes versus the launch files: one encode instead of three, native 29.97 fps instead
# of a 25 fps resample, much lower compression, and phones now receive 720p instead of 480p.
#
# Outputs (public/assets/video/):
#   hero-720p.webm  VP9   (Chrome, Edge, Firefox, Samsung Internet, Android)
#   hero-720p.mp4   H.264 (Safari / iOS fallback)
#   hero-poster-720p.{avif,webp,jpg}  first frame: LCP image, shown until the video plays
set -euo pipefail
SRC="$1"; OUT="$(cd "$(dirname "$0")/.." && pwd)/public/assets/video"; mkdir -p "$OUT"
EDIT="[0:v]trim=6.5:8.8,setpts=PTS-STARTPTS[c0];[0:v]trim=57:59.2,setpts=PTS-STARTPTS[c1];\
[0:v]trim=33.4:35.6,setpts=PTS-STARTPTS[c2];[0:v]trim=30:33.4,setpts=PTS-STARTPTS[c3];\
[0:v]trim=21:23.6,setpts=PTS-STARTPTS[c4];[0:v]trim=3:5.6,setpts=PTS-STARTPTS[c5];\
[0:v]trim=6.2:6.5,setpts=PTS-STARTPTS[c6];[c0][c1][c2][c3][c4][c5][c6]concat=n=7:v=1:a=0,\
eq=contrast=1.06:saturation=0.92,format=yuv420p[v]"
ffmpeg -v error -y -i "$SRC" -filter_complex "$EDIT" -map "[v]" -an \
  -c:v libx264 -preset veryslow -tune film -profile:v high -level 4.0 -crf 19 -g 60 -movflags +faststart "$OUT/hero-720p.mp4"
VP9="-c:v libvpx-vp9 -b:v 0 -crf 26 -row-mt 1 -tile-columns 2 -deadline good -cpu-used 1 -g 60 -an"
ffmpeg -v error -y -i "$SRC" -filter_complex "$EDIT" -map "[v]" $VP9 -pass 1 -f null /dev/null
ffmpeg -v error -y -i "$SRC" -filter_complex "$EDIT" -map "[v]" $VP9 -pass 2 "$OUT/hero-720p.webm"
rm -f ffmpeg2pass-*.log
ffmpeg -v error -y -i "$OUT/hero-720p.mp4" -frames:v 1 "$OUT/hero-poster-720p.png"
python3 - "$OUT" <<'PY'
import sys; from PIL import Image
o=sys.argv[1]; im=Image.open(f'{o}/hero-poster-720p.png').convert('RGB')
im.save(f'{o}/hero-poster-720p.avif',quality=60,speed=4); im.save(f'{o}/hero-poster-720p.webp',quality=82,method=6)
im.save(f'{o}/hero-poster-720p.jpg',quality=86,optimize=True,progressive=True)
PY
rm -f "$OUT/hero-poster-720p.png"
