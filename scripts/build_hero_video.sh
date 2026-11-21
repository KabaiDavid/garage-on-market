#!/usr/bin/env bash
# Re-encode the hero loop in ONE generation from the restaurant's original brand video
# (1280x720, 29.97 fps — the highest resolution published). Usage:
#   scripts/build_hero_video.sh path/to/original.mp4
# Outputs to public/assets/video/:
#   hero-land.{webm,mp4}   1280x720 landscape  (desktop, laptops, landscape tablets/phones)
#   hero-port.{webm,mp4}   720x1280 portrait   (phones, portrait tablets) — center crop at full
#                          source resolution, upscaled once with Lanczos instead of by the browser
#   hero-poster-{land,port}.{avif,webp,jpg}  first frame, used as LCP image and no-video fallback
set -euo pipefail
SRC="$1"; OUT="$(cd "$(dirname "$0")/.." && pwd)/public/assets/video"; mkdir -p "$OUT"
# Edit: seven complete shots, cut exactly on the original's shot boundaries (found with
# ffmpeg scene detection) so no sub-second slivers appear at the joins:
# ember pizza, bar, cheers, cocktail build, oven + fire, dough + chef, whiskey pour.
CUTS="[0:v]trim=6.144:8.036,setpts=PTS-STARTPTS[c0];[0:v]trim=8.104:9.276,setpts=PTS-STARTPTS[c1];[0:v]trim=57.724:59.276,setpts=PTS-STARTPTS[c2];[0:v]trim=32.934:35.566,setpts=PTS-STARTPTS[c3];[0:v]trim=30.334:31.766,setpts=PTS-STARTPTS[c4];[0:v]trim=21.754:24.056,setpts=PTS-STARTPTS[c5];[0:v]trim=3.804:5.376,setpts=PTS-STARTPTS[c6];\
[c0][c1][c2][c3][c4][c5][c6]concat=n=7:v=1:a=0,hqdn3d=1.2:1.2:2.5:2.5,eq=contrast=1.06:saturation=0.92"
LAND="$CUTS,format=yuv420p[v]"
PORT="$CUTS,crop=406:720:(iw-406)/2:0,scale=720:1280:flags=lanczos+accurate_rnd+full_chroma_int,setsar=1,format=yuv420p[v]"
X264="-c:v libx264 -preset veryslow -tune film -profile:v high -level 4.1 -g 60 -keyint_min 30 -movflags +faststart -an"
VP9="-c:v libvpx-vp9 -b:v 0 -row-mt 1 -tile-columns 2 -deadline good -cpu-used 1 -g 60 -an"
for kind in ${KINDS:-land port}; do
  FILTER=$([ $kind = land ] && echo "$LAND" || echo "$PORT")
  ffmpeg -v error -y -i "$SRC" -filter_complex "$FILTER" -map "[v]" $X264 -crf 20 "$OUT/hero-$kind.mp4"
  ffmpeg -v error -y -i "$SRC" -filter_complex "$FILTER" -map "[v]" $VP9 -crf 27 -pass 1 -f null /dev/null
  ffmpeg -v error -y -i "$SRC" -filter_complex "$FILTER" -map "[v]" $VP9 -crf 27 -pass 2 "$OUT/hero-$kind.webm"
  ffmpeg -v error -y -i "$OUT/hero-$kind.mp4" -frames:v 1 -q:v 2 "$OUT/hero-poster-$kind.png"
done
rm -f ffmpeg2pass-*.log
