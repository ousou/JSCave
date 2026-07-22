# Browser reference images

Written by: Codex on behalf of Sebastian

`title-1x.png` and `title-4x.png` are the JavaCave drawing references. The
`browser-*-1x.png` and `browser-*-4x.png` files are deterministic JSCave
Chrome captures of the named browser frames.

`java/` contains the legacy JavaCave source and its applet provenance. They are
reference material, not part of the JavaScript runtime.

The JSCave captures preserve the Java geometry, palette, layer order, and
nearest-neighbor enlargement. Browser text is accepted as font-only variance:
Chrome's available Times New Roman-compatible font has different glyph
rasterization from the Java AWT serif font. Automated logical checks therefore
mask only the documented text rectangles while retaining the surrounding
geometry and palette.
