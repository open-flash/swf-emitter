import { Incident } from "incident";
import { Uint2, Uint8 } from "semantic-types";
import { ColorSpace, ColorStop, Gradient, GradientSpread, MorphColorStop, MorphGradient } from "swf-tree";
import { ByteStream } from "../stream";
import { emitSRgb8, emitStraightSRgba8 } from "./basic-data-types";

const GRADIENT_SPREAD_TO_CODE: Map<GradientSpread, Uint2> = new Map([
  [GradientSpread.Pad, 0 as Uint2],
  [GradientSpread.Reflect, 1 as Uint2],
  [GradientSpread.Repeat, 2 as Uint2],
]);

const COLOR_SPACE_TO_CODE: Map<ColorSpace, Uint2> = new Map([
  [ColorSpace.LinearRgb, 1 as Uint2],
  [ColorSpace.SRgb, 0 as Uint2],
]);

export function emitColorStop(byteStream: ByteStream, value: ColorStop, withAlpha: boolean): void {
  byteStream.writeUint8(value.ratio);
  if (withAlpha) {
    emitStraightSRgba8(byteStream, value.color);
  } else {
    emitSRgb8(byteStream, value.color);
  }
}

export function emitGradient(byteStream: ByteStream, value: Gradient, withAlpha: boolean): void {
  const spreadCode: Uint2 | undefined = GRADIENT_SPREAD_TO_CODE.get(value.spread);
  const colorSpaceCode: Uint2 | undefined = COLOR_SPACE_TO_CODE.get(value.colorSpace);
  if (spreadCode === undefined) {
    throw new Incident("UnexpectedSpread");
  }
  if (colorSpaceCode === undefined) {
    throw new Incident("UnexpectedColorSpace");
  }

  const flags: Uint8 = 0
    | ((value.colors.length & 0x0f) << 0)
    | ((colorSpaceCode & 0x03) << 4)
    | ((spreadCode & 0x03) << 6);
  byteStream.writeUint8(flags);

  for (const colorStop of value.colors) {
    emitColorStop(byteStream, colorStop, withAlpha);
  }
}

export function emitMorphColorStop(byteStream: ByteStream, value: MorphColorStop, withAlpha: boolean): void {
  emitColorStop(byteStream, {ratio: value.ratio, color: value.color}, withAlpha);
  emitColorStop(byteStream, {ratio: value.morphRatio, color: value.morphColor}, withAlpha);
}

export function emitMorphGradient(byteStream: ByteStream, value: MorphGradient, withAlpha: boolean): void {
  const spreadCode: Uint2 | undefined = GRADIENT_SPREAD_TO_CODE.get(value.spread);
  const colorSpaceCode: Uint2 | undefined = COLOR_SPACE_TO_CODE.get(value.colorSpace);
  if (spreadCode === undefined) {
    throw new Incident("UnexpectedSpread");
  }
  if (colorSpaceCode === undefined) {
    throw new Incident("UnexpectedColorSpace");
  }

  const flags: Uint8 = 0
    | ((value.colors.length & 0x0f) << 0)
    | ((colorSpaceCode & 0x03) << 4)
    | ((spreadCode & 0x03) << 6);
  byteStream.writeUint8(flags);

  for (const colorStop of value.colors) {
    emitMorphColorStop(byteStream, colorStop, withAlpha);
  }
}
