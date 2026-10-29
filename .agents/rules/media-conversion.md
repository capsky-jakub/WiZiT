---
trigger: model_decision
description: "Rules for converting animated WebP, GIF, and video assets, prioritizing native-resolution MP4 for UI recordings and streaming via Pillow + FFmpeg."
---

# Media Conversion & UI Screen Recording Standards

## 1. Format Selection for UI Demos & Chat/Social Attachments
* **Prefer MP4 over GIF:** When converting or exporting UI screen recordings or app demos for chat/social platforms (e.g., LinkedIn, Slack, GitHub), always recommend and generate **H.264 MP4** (`-c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart`) at native resolution.
* **No Downscaled Blurry GIFs:** Never downscale the resolution of UI recordings (e.g., to 640px width) to force-fit platform GIF size or cumulative pixel limits, as downscaling destroys text legibility and UI sharpness.
* **Even-Dimension Padding for H.264:** Always include `-vf "pad=ceil(iw/2)*2:ceil(ih/2)*2"` when encoding arbitrary screen capture dimensions to `yuv420p` so odd pixel dimensions do not fail H.264 macroblock alignment.

## 2. Animated WebP Conversion Pipeline (Linux)
* **Avoid ImageMagick & Direct FFmpeg on Animated WebP:**
  * Direct `ffmpeg -i input.webp` fails on animated WebP (`ANMF`/`ANIM` chunks are unsupported by FFmpeg's demuxer).
  * `magick input.webp -coalesce ...` exhausts the default 2 GiB ImageMagick pixel-cache disk policy on multi-hundred-frame HD animations.
* **Standard Streaming Pipeline (`Pillow` → `FFmpeg`):**
  * Decode frames sequentially in memory using Python `Pillow` (`PIL.ImageSequence.Iterator`) inside a PEP 723 script executed via `uv run`, and pipe raw RGBA bytes directly to `ffmpeg -f rawvideo -pix_fmt rgba -i pipe:0`.
