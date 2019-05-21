# 0.7.0 (2019-05-21)

- **[Breaking change]** Update to `swf-tree@0.7`.

### Typescript

- **[Internal]** Update build tools.

# 0.3.1 (2019-04-26)

- **[Fix]** Zero-out style bits in morph shape end state.
- **[Fix]** Force long-form tag header for the following concrete tags: `DefineBits`, `DefineBitsJPEG2`, `DefineBitsJPEG3`, `DefineBitsLossless`, `DefineBitsLossless2`, `DefineBitsJPEG4` and `SoundStreamBlock`.

### Rust

- **[Feature]** Implement emitters for the following tags: `DefineBitmap`, `DefineButton`, `DefineDynamicText`, `DefineJpegTables`, `DefineSound`, `ExportAssets`, `FrameLabel`.
- **[Fix]** Fix `LineStyle2` and `MorphLineStyle2` flags.
- **[Fix]** Fix `MorphLineStyle2` with solid fill.
- **[Internal]** Use exhaustive match in `emit_tag`.

### Typescript

- **[Fix]** Use shorter bit count for `ColorTransform` and `ColorTransformWithAlpha`.
- **[Fix]** Fix `ButtonCond` flags.
- **[Fix]** Fix `DefineDynamicText` layout support.

# 0.3.0 (2019-04-24)

### Rust

- **[Feature]** Add Rust implementation.
- **[Feature]** Implement emitters for the following tags: `CsmTextSettings`, `DefineFont`, `DefineFontAlignZones`, `DefineFontName`, `DefineMorphShape`, `DefineSceneAndFrameLabelData`, `DefineShape`, `DefineSprite`, `DefineText`, `DoAction`, `FileAttributes`, `Metadata`, `PlaceObject`, `RemoveObject`, `SetBackgroundColor`, `ShowFrame`.
- **[Feature]** Implement `emit_movie`.

### Typescript

- **[Breaking change]** Update to `swf-tree@0.6.0`.
- **[Fix]** Fix `emitFontAlignmentZone` flags.
- **[Fix]** Fix `emitDefineMorphShapeAny` flags.
- **[Fix]** Use shorter bit counts for shape styles and glyphs.
- **[Fix]** Fix `emitTextRecord` flags.

# 0.2.0 (2019-01-22)

### Typescript

- **[Breaking change]** Update to `swf-tree@0.2.0`.

# 0.1.1 (2019-01-21)

### Typescript

- **[Fix]** Fix `emitPlaceObject`.
- **[Fix]** Fix `emitDefineSprite`.
- **[Fix]** Move stream implementation to `@open-flash/stream`.
- **[Internal]** Add end-to-end tests.

# 0.1.0 (2019-01-12)

### Typescript

- **[Fix]** Update dependencies.

# 0.0.8 (2018-11-07)

### Typescript

- **[Breaking change]** Use opaque bytes for AVM1. Use [open-flash/avm1-emitter](https://github.com/open-flash/avm1-emitter) to convert AVM1 actions to bytes.
