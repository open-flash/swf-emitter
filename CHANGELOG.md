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
