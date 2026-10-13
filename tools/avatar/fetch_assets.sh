#!/usr/bin/env bash
# Downloads the CC0 source assets for the fitting-room avatar into .cache/
#   MakeHuman (CC0 base mesh, rig, weights, targets, eyes)
#   Poly Haven (CC0 fabric scans + studio HDRI)
set -euo pipefail
cd "$(dirname "$0")"
MH=.cache/mh; PH=.cache/ph
B=https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data
get() { [ -s "$2" ] || { mkdir -p "$(dirname "$2")"; curl -fsSL "$1" -o "$2"; echo "  $2"; }; }

echo "MakeHuman"
for f in 3dobjs/base.obj rigs/default.mhskel rigs/default_weights.mhw \
  eyes/high-poly/high-poly.obj eyes/high-poly/high-poly.mhclo eyes/materials/brown_eye.png; do
  get "$B/$f" "$MH/$f"
done
for e in caucasian african asian; do for s in female male; do
  get "$B/targets/macrodetails/$e-$s-young.target" "$MH/targets/macrodetails/$e-$s-young.target"
done; done
for t in universal-female-young-averagemuscle-averageweight universal-female-young-averagemuscle-maxweight \
  universal-female-young-averagemuscle-minweight universal-female-young-maxmuscle-averageweight \
  universal-female-young-minmuscle-averageweight universal-male-young-averagemuscle-averageweight \
  universal-male-young-averagemuscle-maxweight universal-male-young-averagemuscle-minweight; do
  get "$B/targets/macrodetails/$t.target" "$MH/targets/macrodetails/$t.target"
done
for s in female male; do
  get "$B/targets/macrodetails/proportions/$s-young-averagemuscle-averageweight-idealproportions.target" \
      "$MH/targets/macrodetails/proportions/$s-young-averagemuscle-averageweight-idealproportions.target"
  for h in max min; do
    get "$B/targets/macrodetails/height/$s-young-averagemuscle-averageweight-${h}height.target" \
        "$MH/targets/macrodetails/height/$s-young-averagemuscle-averageweight-${h}height.target"
  done
done
for c in max min; do
  get "$B/targets/breast/female-young-averagemuscle-averageweight-${c}cup-averagefirmness.target" \
      "$MH/targets/breast/female-young-averagemuscle-averageweight-${c}cup-averagefirmness.target"
done

echo "Poly Haven"
T=https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k
for id in $(python3 -I -c "import json;print(' '.join(json.load(open('fabrics.json')).values()))"); do
  for m in diff nor_gl rough; do get "$T/$id/${id}_${m}_1k.jpg" "$PH/$id/${m}.jpg"; done
done
get https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr "$PH/studio.hdr"
echo done
