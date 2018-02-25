import { Incident } from "incident";
import { Uint16, Uint2, Uint5, Uint8, UintSize } from "semantic-types";
import { morphFillStyles, MorphFillStyleType } from "swf-tree";
import { JoinStyleType } from "swf-tree/join-styles/_type";
import { Matrix } from "swf-tree/matrix";
import { MorphFillStyle } from "swf-tree/morph-fill-style";
import { MorphLineStyle } from "swf-tree/morph-line-style";
import { MorphShape } from "swf-tree/morph-shape";
import { MorphShapeRecord } from "swf-tree/morph-shape-record";
import { MorphShapeRecordType } from "swf-tree/morph-shape-records/_type";
import { MorphStyleChange } from "swf-tree/morph-shape-records/morph-style-change";
import { ShapeRecordType } from "swf-tree/shape-records/_type";
import { getBitCount } from "../get-bit-count";
import { BitStream, ByteStream, Stream } from "../stream";
import { emitMatrix, emitStraightSRgba8 } from "./basic-data-types";
import { emitMorphGradient } from "./gradient";
import { emitCurvedEdgeBits, emitListLength, emitStraightEdgeBits, getCapStyleCode, getJoinStyleCode } from "./shape";

export enum MorphShapeVersion {
  MorphShape1 = 1,
  MorphShape2 = 2,
}

export function emitMorphShape(byteStream: ByteStream, value: MorphShape, morphShapeVersion: MorphShapeVersion): void {
  const shapeStream: Stream = new Stream();
  const startShapeSize: UintSize = emitMorphShapeBits(shapeStream, value, morphShapeVersion);
  byteStream.writeUint32LE(startShapeSize);
  byteStream.write(shapeStream);
}

/**
 * @param bitStream Bitstream where the morph shape should be emitted
 * @param value Morph shape to emit
 * @param morphShapeVersion Morphshape version to use
 * @return Size of the start shape in bytes
 */
export function emitMorphShapeBits(
  bitStream: BitStream,
  value: MorphShape,
  morphShapeVersion: MorphShapeVersion,
): UintSize {
  let fillBits: UintSize;
  let lineBits: UintSize;
  [fillBits, lineBits] = emitMorphShapeStylesBits(
    bitStream,
    {fill: value.fillStyles, line: value.lineStyles},
    morphShapeVersion,
  );
  emitMorphShapeStartRecordStringBits(bitStream, value.records, fillBits, lineBits, morphShapeVersion);
  bitStream.align();

  const result: UintSize = bitStream.bytePos;

  // TODO: We should be able to skip these bits (no styles used for the endRecords)
  fillBits = 0b1111;
  lineBits = 0b1111;
  bitStream.writeUint32Bits(4, fillBits);
  bitStream.writeUint32Bits(4, lineBits);
  emitMorphShapeEndRecordStringBits(bitStream, value.records);
  bitStream.align();

  return result;
}

export interface MorphShapeStyles {
  fill: MorphFillStyle[];
  line: MorphLineStyle[];
}

/**
 *
 * @return [fillBits, lineBits]
 */
export function emitMorphShapeStylesBits(
  bitStream: BitStream,
  value: MorphShapeStyles,
  morphShapeVersion: MorphShapeVersion,
): [UintSize, UintSize] {
  const byteStream: ByteStream = bitStream.asByteStream();
  emitMorphFillStyleList(byteStream, value.fill);
  emitMorphLineStyleList(byteStream, value.line, morphShapeVersion);
  const fillBits: UintSize = getBitCount(value.fill.length + 1); // `+ 1` because of empty style
  const lineBits: UintSize = getBitCount(value.line.length + 1); // `+ 1` because of empty style
  bitStream.writeUint32Bits(4, fillBits);
  bitStream.writeUint32Bits(4, lineBits);
  return [fillBits, lineBits];
}

export function emitMorphShapeStartRecordStringBits(
  bitStream: BitStream,
  value: MorphShapeRecord[],
  fillBits: UintSize,
  lineBits: UintSize,
  morphShapeVersion: MorphShapeVersion,
): void {
  for (const record of value) {
    if (record.type === MorphShapeRecordType.MorphStyleChange) {
      bitStream.writeBoolBits(false); // isEdge
      [fillBits, lineBits] = emitMorphStyleChangeBits(bitStream, record, fillBits, lineBits, morphShapeVersion);
    } else {
      bitStream.writeBoolBits(true); // isEdge

      if (record.type === MorphShapeRecordType.MorphCurvedEdge) {
        if (record.startControlDelta.x === record.startAnchorDelta.x
          && record.startControlDelta.y === record.startAnchorDelta.y
        ) {
          emitStraightEdgeBits(
            bitStream,
            {
              type: ShapeRecordType.StraightEdge,
              delta: {x: 2 * record.startControlDelta.x, y: 2 * record.startControlDelta.y},
            },
          );
        } else {
          emitCurvedEdgeBits(
            bitStream,
            {
              type: ShapeRecordType.CurvedEdge,
              controlDelta: record.startControlDelta,
              anchorDelta: record.startAnchorDelta,
            },
          );
        }
      } else {
        emitStraightEdgeBits(
          bitStream,
          {
            type: ShapeRecordType.StraightEdge,
            delta: record.startDelta,
          },
        );
      }
    }
  }
  bitStream.writeUint16Bits(6, 0);
}

export function emitMorphShapeEndRecordStringBits(
  bitStream: BitStream,
  value: MorphShapeRecord[],
): void {
  for (const record of value) {
    if (record.type === MorphShapeRecordType.MorphStyleChange) {
      if (record.startMoveTo === undefined) {
        continue;
      }
      bitStream.writeBoolBits(false); // isEdge
      const flags: Uint5 = 0b00001; // Simple `moveTo`
      bitStream.writeUint16Bits(5, flags);
      if (record.endMoveTo === undefined) {
        throw new Incident("UndefinedEndMoveTo");
      }
      const bitCount: UintSize = getBitCount(record.endMoveTo.x, record.endMoveTo.y);
      bitStream.writeUint16Bits(5, bitCount);
      bitStream.writeSint32Bits(bitCount, record.startMoveTo!.x);
      bitStream.writeSint32Bits(bitCount, record.startMoveTo!.y);
    } else {
      bitStream.writeBoolBits(true); // isEdge
      if (record.type === MorphShapeRecordType.MorphCurvedEdge) {
        if (record.endControlDelta.x === record.endAnchorDelta.x
          && record.endControlDelta.y === record.endAnchorDelta.y
        ) {
          emitStraightEdgeBits(
            bitStream,
            {
              type: ShapeRecordType.StraightEdge,
              delta: {x: 2 * record.endControlDelta.x, y: 2 * record.endControlDelta.y},
            },
          );
        } else {
          emitCurvedEdgeBits(
            bitStream,
            {
              type: ShapeRecordType.CurvedEdge,
              controlDelta: record.endControlDelta,
              anchorDelta: record.endAnchorDelta,
            },
          );
        }
      } else {
        emitStraightEdgeBits(
          bitStream,
          {
            type: ShapeRecordType.StraightEdge,
            delta: record.endDelta,
          },
        );
      }
    }
  }
  bitStream.writeUint16Bits(6, 0);
}

export function emitMorphStyleChangeBits(
  bitStream: BitStream,
  value: MorphStyleChange,
  fillBits: UintSize,
  lineBits: UintSize,
  morphShapeVersion: MorphShapeVersion,
): [UintSize, UintSize] {
  const hasNewStyles: boolean = value.fillStyles !== undefined && value.lineStyles !== undefined;
  const changeLineStyle: boolean = value.lineStyle !== undefined;
  const changeRightFill: boolean = value.rightFill !== undefined;
  const changeLeftFill: boolean = value.leftFill !== undefined;
  const hasMoveTo: boolean = value.startMoveTo !== undefined;

  bitStream.writeBoolBits(hasNewStyles);
  bitStream.writeBoolBits(changeLineStyle);
  bitStream.writeBoolBits(changeRightFill);
  bitStream.writeBoolBits(changeLeftFill);
  bitStream.writeBoolBits(hasMoveTo);

  if (hasMoveTo) {
    const bitCount: UintSize = getBitCount(value.startMoveTo!.x, value.startMoveTo!.y);
    bitStream.writeUint16Bits(5, bitCount);
    bitStream.writeSint32Bits(bitCount, value.startMoveTo!.x);
    bitStream.writeSint32Bits(bitCount, value.startMoveTo!.y);
  }

  if (changeLeftFill) {
    bitStream.writeUint16Bits(fillBits, value.leftFill!);
  }
  if (changeRightFill) {
    bitStream.writeUint16Bits(fillBits, value.rightFill!);
  }
  if (changeLineStyle) {
    bitStream.writeUint16Bits(lineBits, value.lineStyle!);
  }

  if (hasNewStyles) {
    [fillBits, lineBits] = emitMorphShapeStylesBits(bitStream, {
      fill: value.fillStyles!,
      line: value.lineStyles!,
    }, morphShapeVersion);
  }

  return [fillBits, lineBits];
}

export function emitMorphFillStyleList(byteStream: ByteStream, value: MorphFillStyle[]): void {
  emitListLength(byteStream, value.length, true);
  for (const fillStyle of value) {
    emitMorphFillStyle(byteStream, fillStyle);
  }
}

export function emitMorphFillStyle(byteStream: ByteStream, value: MorphFillStyle): void {
  let code: Uint8;
  switch (value.type) {
    case MorphFillStyleType.Bitmap:
      code = 0x40
        | (!value.smoothed ? 1 << 0 : 0)
        | (!value.repeating ? 1 << 1 : 0);
      emitMorphBitmapFill(byteStream, value);
      break;
    case MorphFillStyleType.FocalGradient:
      code = 0x13;
      emitMorphFocalGradientFill(byteStream, value);
      break;
    case MorphFillStyleType.LinearGradient:
      code = 0x10;
      emitMorphLinearGradientFill(byteStream, value);
      break;
    case MorphFillStyleType.RadialGradient:
      code = 0x12;
      emitMorphRadialGradientFill(byteStream, value);
      break;
    case MorphFillStyleType.Solid:
      code = 0x00;
      emitMorphSolidFill(byteStream, value);
      break;
    default:
      throw new Incident("UnexpectedMorphFillStyle");
  }
}

export function emitMorphBitmapFill(
  byteStream: ByteStream,
  value: { bitmapId: Uint16; startMatrix: Matrix; endMatrix: Matrix },
): void {
  byteStream.writeUint16LE(value.bitmapId);
  emitMatrix(byteStream, value.startMatrix);
  emitMatrix(byteStream, value.endMatrix);
}

export function emitMorphFocalGradientFill(byteStream: ByteStream, value: morphFillStyles.FocalGradient): void {
  emitMatrix(byteStream, value.startMatrix);
  emitMatrix(byteStream, value.endMatrix);
  emitMorphGradient(byteStream, value.gradient, true);
  byteStream.writeFixed8P8LE(value.startFocalPoint);
  byteStream.writeFixed8P8LE(value.endFocalPoint);
}

export function emitMorphLinearGradientFill(
  byteStream: ByteStream,
  value: morphFillStyles.LinearGradient,
): void {
  emitMatrix(byteStream, value.startMatrix);
  emitMatrix(byteStream, value.endMatrix);
  emitMorphGradient(byteStream, value.gradient, true);
}

export function emitMorphRadialGradientFill(
  byteStream: ByteStream,
  value: morphFillStyles.RadialGradient,
): void {
  emitMatrix(byteStream, value.startMatrix);
  emitMatrix(byteStream, value.endMatrix);
  emitMorphGradient(byteStream, value.gradient, true);
}

export function emitMorphSolidFill(byteStream: ByteStream, value: morphFillStyles.Solid): void {
  emitStraightSRgba8(byteStream, value.startColor);
  emitStraightSRgba8(byteStream, value.endColor);
}

export function emitMorphLineStyleList(
  byteStream: ByteStream,
  value: MorphLineStyle[],
  morphShapeVersion: MorphShapeVersion,
): void {
  emitListLength(byteStream, value.length, true);
  for (const lineStyle of value) {
    if (morphShapeVersion < MorphShapeVersion.MorphShape2) {
      emitMorphLineStyle1(byteStream, lineStyle);
    } else {
      emitMorphLineStyle2(byteStream, lineStyle);
    }
  }
}

export function emitMorphLineStyle1(byteStream: ByteStream, value: MorphLineStyle): void {
  if (value.fill.type !== MorphFillStyleType.Solid) {
    throw new Incident("ExpectedSolidMorphFill");
  }
  byteStream.writeUint16LE(value.startWidth);
  byteStream.writeUint16LE(value.endWidth);
  emitStraightSRgba8(byteStream, value.fill.startColor);
  emitStraightSRgba8(byteStream, value.fill.endColor);
}

export function emitMorphLineStyle2(byteStream: ByteStream, value: MorphLineStyle): void {
  byteStream.writeUint16LE(value.startWidth);
  byteStream.writeUint16LE(value.endWidth);

  const hasFill: boolean = value.fill.type !== MorphFillStyleType.Solid;
  const joinStyleCode: Uint2 = getJoinStyleCode(value.join.type);
  const startCapStyleCode: Uint2 = getCapStyleCode(value.startCap);
  const endCapStyleCode: Uint2 = getCapStyleCode(value.endCap);

  const flags: Uint16 = 0
    | (value.pixelHinting ? 1 << 0 : 0)
    | (value.noVScale ? 1 << 1 : 0)
    | (value.noHScale ? 1 << 2 : 0)
    | (hasFill ? 1 << 3 : 0)
    | ((joinStyleCode & 0b11) << 4)
    | ((startCapStyleCode & 0b11) << 6)
    | ((endCapStyleCode & 0b11) << 8)
    | (value.noClose ? 1 << 10 : 0);
  // (Skip 5 bits)
  byteStream.writeUint16LE(flags);

  if (value.join.type === JoinStyleType.Miter) {
    byteStream.writeFixed8P8LE(value.join.limit);
  }

  if (hasFill) {
    emitMorphFillStyle(byteStream, value.fill);
  } else {
    emitStraightSRgba8(byteStream, (value.fill as morphFillStyles.Solid).startColor);
    emitStraightSRgba8(byteStream, (value.fill as morphFillStyles.Solid).endColor);
  }
}
