import { Incident } from "incident";
import { Uint16, Uint2, Uint32, Uint4, Uint8, UintSize } from "semantic-types";
import { Tag, tags, TagType } from "swf-tree";
import { BitStream, ByteStream, Stream } from "../stream";
import {
  emitColorTransform,
  emitColorTransformWithAlpha,
  emitMatrix,
  emitRect,
  emitSRgb8,
  emitStraightSRgba8,
} from "./basic-data-types";
import { ButtonVersion, emitButton2CondActionString, emitButtonRecordString } from "./button";
import { emitBlendMode, emitClipActionsString, emitFilterList, } from "./display";
import { emitMorphShape, MorphShapeVersion } from "./morph-shape";
import { emitShape, getCapStyleCode, getJoinStyleCode, getMinShapeVersion, ShapeVersion } from "./shape";
import {
  emitCsmTableHintBits,
  emitFontAlignmentZone,
  emitFontLayout,
  emitGridFittingBits,
  emitLanguageCode,
  emitOffsetGlyphs,
  emitTextAlignment,
  emitTextRecordString,
  emitTextRendererBits,
} from "./text";
import { getSintBitCount, getUintBitCount } from "../get-bit-count";
import { SoundType } from "swf-tree/sound/sound-type";
import { getAudioCodingFormatCode, getSoundRateCode } from "./sound";

/**
 * Read tags until the end of the stream or "end-of-tags".
 */
export function emitTagString(byteStream: ByteStream, value: Tag[], swfVersion: Uint8): void {
  for (const tag of value) {
    emitTag(byteStream, tag, swfVersion);
  }
  byteStream.writeUint8(0);
}

interface TagHeader {
  code: Uint16;
  length: Uint32;
}

function emitTagHeader(byteStream: ByteStream, value: TagHeader): void {
  const LENGTH_MASK: Uint8 = 0b00111111;

  if (value.length < LENGTH_MASK) {
    const codeAndLength: Uint16 = (value.code << 6) | value.length;
    byteStream.writeUint16LE(codeAndLength);
  } else {
    const codeAndLength: Uint16 = (value.code << 6) | LENGTH_MASK;
    byteStream.writeUint16LE(codeAndLength);
    byteStream.writeUint32LE(value.length);
  }
}

// tslint:disable-next-line:cyclomatic-complexity
export function emitTag(byteStream: ByteStream, value: Tag, swfVersion: Uint8): void {
  type TagEmitter = number | [(
    byteStream: ByteStream,
    value: Tag,
    swfVersion?: Uint8,
  ) => any, number | Map<any, number>];

  const TAG_TYPE_TO_EMITTER: Map<TagType, TagEmitter> = new Map<TagType, TagEmitter>([
    [TagType.CsmTextSettings, <TagEmitter> [emitCsmTextSettings, 74]],
    [
      TagType.DefineBitmap,
      <TagEmitter> [
        emitDefineBitmapAny,
        new Map([
          [DefineBitmapVersion.DefineBitsJpeg1, 6],
          [DefineBitmapVersion.DefineBitsLossless1, 20],
          [DefineBitmapVersion.DefineBitsJpeg2, 21],
          [DefineBitmapVersion.DefineBitsJpeg3, 35],
          [DefineBitmapVersion.DefineBitsLossless2, 36],
          [DefineBitmapVersion.DefineBitsJpeg4, 90],
        ]),
      ],
    ],
    [
      TagType.DefineButton,
      <TagEmitter> [
        emitDefineButton,
        new Map([
          [ButtonVersion.Button2, 34],
        ]),
      ],
    ],
    [TagType.DefineDynamicText, <TagEmitter> [emitDefineEditText, 37]],
    [
      TagType.DefineFont,
      <TagEmitter> [
        emitDefineFont,
        new Map([
          [DefineFontVersion.Font1, 10],
          [DefineFontVersion.Font2, 48],
          [DefineFontVersion.Font3, 75],
          [DefineFontVersion.Font4, 91],
        ]),
      ],
    ],
    [TagType.DefineFontName, <TagEmitter> [emitDefineFontName, 88]],
    [TagType.DefineFontAlignZones, <TagEmitter> [emitDefineFontAlignZones, 73]],
    [TagType.DefineJpegTables, <TagEmitter> [emitDefineJpegTables, 8]],
    [
      TagType.DefineMorphShape,
      <TagEmitter> [
        emitDefineMorphShapeAny,
        new Map([
          [MorphShapeVersion.MorphShape1, 46],
          [MorphShapeVersion.MorphShape2, 84],
        ]),
      ],
    ],
    [TagType.DefineSceneAndFrameLabelData, <TagEmitter> [emitDefineSceneAndFrameLabelData, 86]],
    [
      TagType.DefineShape,
      <TagEmitter> [
        emitDefineShapeAny,
        new Map([
          [ShapeVersion.Shape1, 2],
          [ShapeVersion.Shape2, 22],
          [ShapeVersion.Shape3, 32],
          [ShapeVersion.Shape4, 83],
        ]),
      ],
    ],
    [TagType.DefineSound, <TagEmitter> [emitDefineSound, 14]],
    [TagType.DefineSprite, <TagEmitter> [emitDefineSprite, 39]],
    [
      TagType.DefineText,
      <TagEmitter> [
        emitDefineTextAny,
        new Map([
          [DefineTextVersion.DefineText1, 11],
        ]),
      ],
    ],
    [TagType.DoAction, <TagEmitter> [emitDoAction, 12]],
    [TagType.DoInitAction, <TagEmitter> [emitDoInitAction, 59]],
    [TagType.ExportAssets, <TagEmitter> [emitExportAssets, 56]],
    [TagType.FileAttributes, <TagEmitter> [emitFileAttributes, 69]],
    [TagType.FrameLabel, <TagEmitter> [emitFrameLabel, 43]],
    [
      TagType.ImportAssets,
      <TagEmitter> [
        emitImportAssetsAny,
        new Map([
          [ImportAssetsVersion.ImportAssets1, 57],
          [ImportAssetsVersion.ImportAssets2, 71],
        ]),
      ],
    ],
    [TagType.Metadata, <TagEmitter> [emitMetadata, 77]],
    [
      TagType.PlaceObject,
      <TagEmitter> [
        emitPlaceObjectAny,
        new Map([
          [PlaceObjectVersion.PlaceObject1, 4],
          [PlaceObjectVersion.PlaceObject2, 26],
          [PlaceObjectVersion.PlaceObject3, 70],
        ]),
      ],
    ],
    [
      TagType.RemoveObject,
      <TagEmitter> [
        emitRemoveObjectAny,
        new Map([
          [RemoveObjectVersion.RemoveObject1, 5],
          [RemoveObjectVersion.RemoveObject2, 28],
        ]),
      ],
    ],
    [TagType.SetBackgroundColor, <TagEmitter> [emitSetBackgroundColor, 9]],
    [TagType.ShowFrame, 1],
  ]);

  if (value.type === TagType.Unknown) {
    emitTagHeader(byteStream, {code: value.code, length: value.data.length});
    byteStream.writeBytes(value.data);
    return;
  }

  const tagEmitter: TagEmitter | undefined = TAG_TYPE_TO_EMITTER.get(value.type);

  if (tagEmitter === undefined) {
    throw new Incident("UnexpectedTagType", {type: value.type, typeName: TagType[value.type]});
  }

  if (typeof tagEmitter === "number") {
    emitTagHeader(byteStream, {code: tagEmitter, length: 0});
    return;
  }

  const tagStream: Stream = new Stream();
  const result: any = tagEmitter[0](tagStream, value, swfVersion);
  let code: number | Map<any, number> = <any> tagEmitter[tagEmitter.length - 1];
  if (typeof code !== "number") {
    const resolved: number | undefined = code.get(result);
    if (resolved === undefined) {
      throw new Incident("UnexpectedTagVersion");
    }
    code = resolved;
  }
  emitTagHeader(byteStream, {code, length: tagStream.bytePos});
  byteStream.write(tagStream);
}

export enum DefineBitmapVersion {
  DefineBitsJpeg1,
  DefineBitsJpeg2,
  DefineBitsJpeg3,
  DefineBitsJpeg4,
  DefineBitsLossless1,
  DefineBitsLossless2,
}

export function emitDefineBitmapAny(byteStream: ByteStream, value: tags.DefineBitmap): DefineBitmapVersion {
  byteStream.writeUint16LE(value.id);
  switch (value.mediaType) {
    case "image/x-swf-bmp":
      byteStream.writeBytes(value.data);
      return DefineBitmapVersion.DefineBitsLossless1;
    case "image/x-swf-abmp":
      byteStream.writeBytes(value.data);
      return DefineBitmapVersion.DefineBitsLossless2;
    case "image/jpeg":
    case "image/gif":
    case "image/png":
      byteStream.writeBytes(value.data);
      return DefineBitmapVersion.DefineBitsJpeg2;
    case "image/x-ajpeg":
      byteStream.writeBytes(value.data);
      return DefineBitmapVersion.DefineBitsJpeg3;
    case "image/x-partial-jpeg":
      byteStream.writeBytes(value.data);
      return DefineBitmapVersion.DefineBitsJpeg1;
    default:
      throw new Incident("UnexpectedMediaType", {tag: value});
  }
}

export function emitDefineButton(byteStream: ByteStream, value: tags.DefineButton): ButtonVersion {
  byteStream.writeUint16LE(value.id);
  const flags: Uint8 = 0
    | (value.trackAsMenu ? 1 << 0 : 0);
  byteStream.writeUint8(flags);
  const buttonRecordStream: Stream = new Stream();
  emitButtonRecordString(buttonRecordStream, value.characters, ButtonVersion.Button2);
  if (value.actions.length === 0) {
    byteStream.writeUint16LE(0);
    byteStream.write(buttonRecordStream);
  } else {
    byteStream.writeUint16LE(buttonRecordStream.bytePos + 2); // `+ 2` for Uint16
    byteStream.write(buttonRecordStream);
    emitButton2CondActionString(byteStream, value.actions);
  }
  return ButtonVersion.Button2;
}

export function emitCsmTextSettings(byteStream: ByteStream, value: tags.CsmTextSettings): void {
  byteStream.writeUint16LE(value.textId);
  const bitStream: BitStream = byteStream.asBitStream();
  emitTextRendererBits(bitStream, value.renderer);
  emitGridFittingBits(bitStream, value.fitting);
  bitStream.align();
  byteStream.writeFloat32LE(value.thickness);
  byteStream.writeFloat32LE(value.sharpness);
  byteStream.writeUint8(0);
}

export enum DefineFontVersion {
  Font1,
  Font2,
  Font3,
  Font4,
}

export function emitDefineFont(byteStream: ByteStream, value: tags.DefineFont): DefineFontVersion {
  byteStream.writeUint16LE(value.id);

  const useWideCodes: boolean = true; // `false` is deprecated since SWF6
  const offsetGlyphStream: Stream = new Stream();
  const useWideOffsets: boolean = value.glyphs !== undefined
    ? emitOffsetGlyphs(offsetGlyphStream, value.glyphs)
    : false;
  const hasLayout: boolean = value.layout !== undefined;

  const flags: Uint8 = 0
    | (value.isBold ? 1 << 0 : 0)
    | (value.isItalic ? 1 << 1 : 0)
    | (useWideCodes ? 1 << 2 : 0)
    | (useWideOffsets ? 1 << 3 : 0)
    | (value.isAnsi ? 1 << 4 : 0)
    | (value.isSmall ? 1 << 5 : 0)
    | (value.isShiftJis ? 1 << 6 : 0)
    | (hasLayout ? 1 << 7 : 0);

  byteStream.writeUint8(flags);
  emitLanguageCode(byteStream, value.language);

  const fontNameStream: Stream = new Stream();
  fontNameStream.writeString(value.fontName); // TODO: See DefineFontInfo for encoding
  byteStream.writeUint8(fontNameStream.bytePos);
  byteStream.write(fontNameStream);

  if (value.glyphs === undefined) {
    // According to Shumway:
    // > The SWF format docs doesn't say that, but the DefineFont{2,3} tag ends here for device fonts.
    byteStream.writeUint16LE(0);
    return DefineFontVersion.Font3;
  }

  byteStream.writeUint16LE(value.glyphs.length);
  byteStream.write(offsetGlyphStream);
  // TODO: Assert codeUnits is defined (should be defined because of .glyphs)
  for (const codeUnit of value.codeUnits!) {
    // We force `useWideCodes` to `true`
    byteStream.writeUint16LE(codeUnit);
  }
  if (hasLayout) {
    emitFontLayout(byteStream, value.layout!);
  }
  return DefineFontVersion.Font3;
}

export function emitDefineFontAlignZones(byteStream: ByteStream, value: tags.DefineFontAlignZones): void {
  byteStream.writeUint16LE(value.fontId);
  const bitStream: BitStream = byteStream.asBitStream();
  emitCsmTableHintBits(bitStream, value.csmTableHint);
  bitStream.align();
  for (const zone of value.zones) {
    emitFontAlignmentZone(byteStream, zone);
  }
}

export function emitDefineJpegTables(byteStream: ByteStream, value: tags.DefineJpegTables): void {
  byteStream.writeBytes(value.data);
}

export function emitDefineFontName(byteStream: ByteStream, value: tags.DefineFontName): void {
  byteStream.writeUint16LE(value.fontId);
  byteStream.writeCString(value.name);
  byteStream.writeCString(value.copyright);
}

export function emitDefineMorphShapeAny(
  byteStream: ByteStream,
  value: tags.DefineMorphShape,
): MorphShapeVersion {
  byteStream.writeUint16LE(value.id);
  emitRect(byteStream, value.bounds);
  emitRect(byteStream, value.morphBounds);

  let version: MorphShapeVersion;
  if (value.edgeBounds !== undefined && value.morphEdgeBounds !== undefined) {
    version = MorphShapeVersion.MorphShape2;
    emitRect(byteStream, value.edgeBounds);
    emitRect(byteStream, value.morphEdgeBounds);
    const flags: Uint8 = 0
      | (value.hasScalingStrokes ? 1 << 0 : 0)
      | (value.hasNonScalingStrokes ? 1 << 0 : 0);
    byteStream.writeUint8(flags);
  } else {
    version = MorphShapeVersion.MorphShape1;
  }

  emitMorphShape(byteStream, value.shape, version);

  return version;
}

export function emitDefineSceneAndFrameLabelData(
  byteStream: ByteStream,
  value: tags.DefineSceneAndFrameLabelData,
): void {
  byteStream.writeUint32LE(value.scenes.length);
  for (const scene of value.scenes) {
    byteStream.writeUint32LE(scene.offset);
    byteStream.writeCString(scene.name);
  }
  byteStream.writeUint32LE(value.labels.length);
  for (const label of value.labels) {
    byteStream.writeUint32LE(label.frame);
    byteStream.writeCString(label.name);
  }
}

function emitDefineShapeAny(byteStream: ByteStream, value: tags.DefineShape): ShapeVersion {
  byteStream.writeUint16LE(value.id);
  emitRect(byteStream, value.bounds);
  let shapeVersion: ShapeVersion;
  if (value.edgeBounds !== undefined) {
    shapeVersion = ShapeVersion.Shape4;
    emitRect(byteStream, value.edgeBounds);
    const flags: Uint8 = 0
      | (value.hasScalingStrokes ? 1 << 0 : 0)
      | (value.hasNonScalingStrokes ? 1 << 1 : 0)
      | (value.hasFillWinding ? 1 << 2 : 0);
    byteStream.writeUint8(flags);
  } else {
    shapeVersion = getMinShapeVersion(value.shape);
    // TODO: Check consistency with flags and edgeBounds
  }
  emitShape(byteStream, value.shape, shapeVersion);
  return shapeVersion;
}

export function emitDefineEditText(byteStream: ByteStream, value: tags.DefineDynamicText): void {
  byteStream.writeUint16LE(value.id);
  emitRect(byteStream, value.bounds);

  const hasFont: boolean = value.fontId !== undefined && value.fontSize !== undefined;
  const hasMaxLength: boolean = value.maxLength !== undefined;
  const hasColor: boolean = value.color !== undefined;
  const readonly: boolean = value.readonly;
  const password: boolean = value.password;
  const multiline: boolean = value.multiline;
  const wordWrap: boolean = value.wordWrap;
  const hasText: boolean = value.text !== undefined;
  const useGlyphFont: boolean = value.useGlyphFont;
  const html: boolean = value.html;
  const wasStatic: boolean = value.wasStatic;
  const border: boolean = value.border;
  const noSelect: boolean = value.noSelect;
  const hasLayout: boolean = value.align !== undefined;
  const autoSize: boolean = value.autoSize;
  const hasFontClass: boolean = value.fontClass !== undefined && value.fontSize !== undefined;

  const flags: Uint16 = 0
    | (hasFont ? 1 << 0 : 0)
    | (hasMaxLength ? 1 << 1 : 0)
    | (hasColor ? 1 << 2 : 0)
    | (readonly ? 1 << 3 : 0)
    | (password ? 1 << 4 : 0)
    | (multiline ? 1 << 5 : 0)
    | (wordWrap ? 1 << 6 : 0)
    | (hasText ? 1 << 7 : 0)
    | (useGlyphFont ? 1 << 8 : 0)
    | (html ? 1 << 9 : 0)
    | (wasStatic ? 1 << 10 : 0)
    | (border ? 1 << 11 : 0)
    | (noSelect ? 1 << 12 : 0)
    | (hasLayout ? 1 << 13 : 0)
    | (autoSize ? 1 << 14 : 0)
    | (hasFontClass ? 1 << 15 : 0);
  byteStream.writeUint16LE(flags);

  if (hasFont) {
    byteStream.writeUint16LE(value.fontId!);
  }
  if (hasFontClass) {
    byteStream.writeCString(value.fontClass!);
  }
  if (hasFont || hasFontClass) {
    byteStream.writeUint16LE(value.fontSize!);
  }
  if (hasColor) {
    emitStraightSRgba8(byteStream, value.color!);
  }
  if (hasMaxLength) {
    byteStream.writeUint16LE(value.maxLength!);
  }
  if (hasLayout) {
    emitTextAlignment(byteStream, value.align!);
    byteStream.writeUint16LE(value.marginLeft);
    byteStream.writeUint16LE(value.marginRight);
    byteStream.writeUint16LE(value.indent);
    byteStream.writeUint16LE(value.leading);
  }
  byteStream.writeCString(value.variableName !== undefined ? value.variableName : "");
  if (hasText) {
    byteStream.writeCString(value.text!);
  }
}

export function emitDefineSound(byteStream: ByteStream, value: tags.DefineSound): void {
  byteStream.writeUint16LE(value.id);

  const soundRateCode: Uint2 = getSoundRateCode(value.soundRate);
  const formatCode: Uint4 = getAudioCodingFormatCode(value.format);

  const flags: Uint8 = 0
    | (value.soundType === SoundType.Stereo ? 1 << 0 : 0)
    | (value.soundSize === 16 ? 1 << 1 : 0)
    | ((soundRateCode & 0b11) << 2)
    | ((formatCode & 0b1111) << 4);
  byteStream.writeUint8(flags);

  byteStream.writeUint32LE(value.sampleCount);
  byteStream.writeBytes(value.data);
}

export function emitDefineSprite(byteStream: ByteStream, value: tags.DefineSprite, swfVersion: Uint8): void {
  byteStream.writeUint16LE(value.id);
  byteStream.writeUint16LE(value.frameCount);
  emitTagString(byteStream, value.tags, swfVersion);
}

export enum DefineTextVersion {
  DefineText1 = 1,
  DefineText2 = 2,
}

export function emitDefineTextAny(byteStream: ByteStream, value: tags.DefineText): DefineTextVersion {
  byteStream.writeUint16LE(value.id);
  emitRect(byteStream, value.bounds);
  emitMatrix(byteStream, value.matrix);
  let indexBits: UintSize = 0;
  let advanceBits: UintSize = 0;
  let hasAlpha: boolean = false;
  for (const record of value.records) {
    if (record.color !== undefined && record.color.a !== 255) {
      hasAlpha = true;
    }
    for (const entry of record.entries) {
      indexBits = Math.max(indexBits, getUintBitCount(entry.index));
      advanceBits = Math.max(advanceBits, getSintBitCount(entry.advance));
    }
  }
  byteStream.writeUint8(indexBits);
  byteStream.writeUint8(advanceBits);
  emitTextRecordString(byteStream, value.records, hasAlpha, indexBits, advanceBits);
  return hasAlpha ? DefineTextVersion.DefineText2 : DefineTextVersion.DefineText1;
}

export function emitDoAction(byteStream: ByteStream, value: tags.DoAction): void {
  byteStream.writeBytes(value.actions);
}

export function emitDoInitAction(byteStream: ByteStream, value: tags.DoInitAction): void {
  byteStream.writeUint16LE(value.spriteId);
  byteStream.writeBytes(value.actions);
}

export function emitExportAssets(byteStream: ByteStream, value: tags.ExportAssets): void {
  byteStream.writeUint16LE(value.assets.length);
  for (const asset of value.assets) {
    byteStream.writeUint16LE(asset.id);
    byteStream.writeCString(asset.name);
  }
}

export function emitFileAttributes(byteStream: ByteStream, value: tags.FileAttributes): void {
  const bitStream: BitStream = byteStream.asBitStream();
  bitStream.writeZerosBits(1);
  bitStream.writeBoolBits(value.useDirectBlit);
  bitStream.writeBoolBits(value.useGpu);
  bitStream.writeBoolBits(value.hasMetadata);
  bitStream.writeBoolBits(value.useAs3);
  bitStream.writeBoolBits(value.noCrossDomainCaching);
  bitStream.writeBoolBits(value.useRelativeUrls);
  bitStream.writeBoolBits(value.useNetwork);
  bitStream.align(); // TODO: assert noop
}

export function emitFrameLabel(byteStream: ByteStream, value: tags.FrameLabel): void {
  byteStream.writeCString(value.name);
  if (value.isAnchor) {
    byteStream.writeUint8(1);
  }
}

export enum ImportAssetsVersion {
  ImportAssets1 = 1,
  ImportAssets2 = 2,
}

export function emitImportAssetsAny(
  byteStream: ByteStream,
  value: tags.ImportAssets,
  swfVersion: Uint8,
): ImportAssetsVersion {
  const version: ImportAssetsVersion = swfVersion < 8
    ? ImportAssetsVersion.ImportAssets1
    : ImportAssetsVersion.ImportAssets2;
  byteStream.writeCString(value.url);
  if (version === ImportAssetsVersion.ImportAssets2) {
    byteStream.writeUint8(1); // Must be 1 according to the spec
    byteStream.writeUint8(0); // Must be 0 according to the spec
  }
  byteStream.writeUint16LE(value.assets.length);
  for (const asset of value.assets) {
    byteStream.writeUint16LE(asset.id);
    byteStream.writeCString(asset.name);
  }
  return version;
}

export function emitMetadata(byteStream: ByteStream, value: tags.Metadata): void {
  byteStream.writeCString(value.metadata);
}

export enum PlaceObjectVersion {
  PlaceObject1 = 1,
  PlaceObject2 = 2,
  PlaceObject3 = 3,
}

// tslint:disable-next-line:cyclomatic-complexity
export function emitPlaceObjectAny(
  byteStream: ByteStream,
  value: tags.PlaceObject,
  swfVersion: UintSize,
): PlaceObjectVersion {
  const isMove: boolean = value.isMove;
  const hasCharacterId: boolean = value.characterId !== undefined;
  const hasMatrix: boolean = value.matrix !== undefined;
  const hasColorTransform: boolean = value.colorTransform !== undefined;
  const hasColorTransformWithAlpha: boolean = value.colorTransform !== undefined
    && (value.colorTransform.alphaMult.valueOf() !== 1 || value.colorTransform.alphaAdd !== 0);
  const hasRatio: boolean = value.ratio !== undefined;
  const hasName: boolean = value.name !== undefined;
  const hasClipDepth: boolean = value.clipDepth !== undefined;
  const hasClipActions: boolean = value.clipActions !== undefined;
  const hasFilters: boolean = value.filters !== undefined;
  const hasBlendMode: boolean = value.blendMode !== undefined;
  const hasCacheHint: boolean = value.bitmapCache !== undefined;
  const hasClassName: boolean = value.className !== undefined;
  const hasImage: boolean = false; // TODO: We need more context to handle images
  const hasVisibility: boolean = value.visible !== undefined;
  const hasBackgroundColor: boolean = value.backgroundColor !== undefined;

  if (hasFilters || hasBlendMode || hasCacheHint || hasClassName || hasImage || hasVisibility || hasBackgroundColor) {
    const flags: Uint16 = 0
      | (hasBackgroundColor ? 1 << 14 : 0)
      | (hasVisibility ? 1 << 13 : 0)
      | (hasImage ? 1 << 12 : 0)
      | (hasClassName ? 1 << 11 : 0)
      | (hasCacheHint ? 1 << 10 : 0)
      | (hasBlendMode ? 1 << 9 : 0)
      | (hasFilters ? 1 << 8 : 0)
      | (hasClipActions ? 1 << 7 : 0)
      | (hasClipDepth ? 1 << 6 : 0)
      | (hasName ? 1 << 5 : 0)
      | (hasRatio ? 1 << 4 : 0)
      | (hasColorTransform ? 1 << 3 : 0)
      | (hasMatrix ? 1 << 2 : 0)
      | (hasCharacterId ? 1 << 1 : 0)
      | (isMove ? 1 << 0 : 0);
    byteStream.writeUint16LE(flags);
    byteStream.writeUint16LE(value.depth);
    if (hasClassName) {
      byteStream.writeCString(value.className!);
    }
    if (hasCharacterId) {
      byteStream.writeUint16LE(value.characterId!);
    }
    if (hasMatrix) {
      emitMatrix(byteStream, value.matrix!);
    }
    if (hasColorTransform) {
      emitColorTransformWithAlpha(byteStream, value.colorTransform!);
    }
    if (hasRatio) {
      byteStream.writeUint16LE(value.ratio!);
    }
    if (hasName) {
      byteStream.writeCString(value.name!);
    }
    if (hasClipDepth) {
      byteStream.writeUint16LE(value.clipDepth!);
    }
    if (hasFilters) {
      emitFilterList(byteStream, value.filters!);
    }
    if (hasBlendMode) {
      emitBlendMode(byteStream, value.blendMode!);
    }
    if (hasCacheHint) {
      byteStream.writeUint8(value.bitmapCache ? 1 : 0);
    }
    if (hasVisibility) {
      byteStream.writeUint8(value.visible ? 1 : 0);
    }
    if (hasBackgroundColor) {
      emitStraightSRgba8(byteStream, value.backgroundColor!);
    }
    if (hasClipActions) {
      emitClipActionsString(byteStream, value.clipActions!, swfVersion >= 6);
    }
    return PlaceObjectVersion.PlaceObject3;
  } else if (
    !hasCharacterId || !hasMatrix || isMove || hasColorTransformWithAlpha
    || hasRatio || hasName || hasClipDepth || hasClipActions
  ) {
    const flags: Uint8 = 0
      | (hasClipActions ? 1 << 7 : 0)
      | (hasClipDepth ? 1 << 6 : 0)
      | (hasName ? 1 << 5 : 0)
      | (hasRatio ? 1 << 4 : 0)
      | (hasColorTransform ? 1 << 3 : 0)
      | (hasMatrix ? 1 << 2 : 0)
      | (hasCharacterId ? 1 << 1 : 0)
      | (isMove ? 1 << 0 : 0);
    byteStream.writeUint8(flags);
    byteStream.writeUint16LE(value.depth);
    if (hasCharacterId) {
      byteStream.writeUint16LE(value.characterId!);
    }
    if (hasMatrix) {
      emitMatrix(byteStream, value.matrix!);
    }
    if (hasColorTransform) {
      emitColorTransformWithAlpha(byteStream, value.colorTransform!);
    }
    if (hasRatio) {
      byteStream.writeUint16LE(value.ratio!);
    }
    if (hasName) {
      byteStream.writeCString(value.name!);
    }
    if (hasClipDepth) {
      byteStream.writeUint16LE(value.clipDepth!);
    }
    if (hasClipActions) {
      emitClipActionsString(byteStream, value.clipActions!, swfVersion >= 6);
    }
    return PlaceObjectVersion.PlaceObject2;
  } else {
    // We have (`hasCharacterId && hasMatrix && !hasColorTransformWithAlpha`)
    byteStream.writeUint16LE(value.characterId!);
    byteStream.writeUint16LE(value.depth);
    emitMatrix(byteStream, value.matrix!);
    if (hasColorTransform) {
      emitColorTransform(byteStream, value.colorTransform!);
    }
    return PlaceObjectVersion.PlaceObject1;
  }
}

export enum RemoveObjectVersion {
  RemoveObject1 = 1,
  RemoveObject2 = 2,
}

export function emitRemoveObjectAny(byteStream: ByteStream, value: tags.RemoveObject): RemoveObjectVersion {
  if (value.characterId !== undefined) {
    byteStream.writeUint16LE(value.characterId);
    byteStream.writeUint16LE(value.depth);
    return RemoveObjectVersion.RemoveObject1;
  } else {
    byteStream.writeUint16LE(value.depth);
    return RemoveObjectVersion.RemoveObject2;
  }
}

export function emitSetBackgroundColor(byteStream: ByteStream, value: tags.SetBackgroundColor): void {
  emitSRgb8(byteStream, value.color);
}
