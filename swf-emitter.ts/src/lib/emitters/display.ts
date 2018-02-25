import { Incident } from "incident";
import { Float32, Uint16, Uint32, Uint4, Uint5, Uint8, UintSize } from "semantic-types";
import {
  avm1,
  BlendMode,
  ClipActions,
  ClipEventFlags,
  ColorStop,
  Filter,
  filters,
  FilterType,
  Fixed16P16,
  Fixed8P8,
  StraightSRgba8,
} from "swf-tree";
import { ByteStream, Stream } from "../stream";
import { emitActionsBlock } from "./avm1";
import { emitStraightSRgba8 } from "./basic-data-types";

export function emitBlendMode(byteStream: ByteStream, value: BlendMode): void {
  const BLEND_MODE_TO_CODE: Map<BlendMode, Uint8> = new Map<BlendMode, Uint8>([
    [BlendMode.Normal, 0],
    [BlendMode.Layer, 2],
    [BlendMode.Multiply, 3],
    [BlendMode.Screen, 4],
    [BlendMode.Lighten, 5],
    [BlendMode.Darken, 6],
    [BlendMode.Difference, 7],
    [BlendMode.Add, 8],
    [BlendMode.Subtract, 9],
    [BlendMode.Invert, 10],
    [BlendMode.Alpha, 11],
    [BlendMode.Erase, 12],
    [BlendMode.Overlay, 13],
    [BlendMode.Hardlight, 14],
  ]);

  const code: Uint8 | undefined = BLEND_MODE_TO_CODE.get(value);
  if (code === undefined) {
    throw new Incident("UnexpectedBlendMode");
  }
  byteStream.writeUint8(code);
}

export function emitClipActionsString(byteStream: ByteStream, value: ClipActions[], extendedEvents: boolean): void {
  byteStream.writeUint16LE(0); // Reserved

  const eventUnion: ClipEventFlags = {
    load: false,
    enterFrame: false,
    unload: false,
    mouseMove: false,
    mouseDown: false,
    mouseUp: false,
    keyDown: false,
    keyUp: false,
    data: false,
    initialize: false,
    press: false,
    release: false,
    releaseOutside: false,
    rollOver: false,
    rollOut: false,
    dragOver: false,
    dragOut: false,
    keyPress: false,
    construct: false,
  };

  for (const clipAction of value) {
    eventUnion.load = eventUnion.load || clipAction.events.load;
    eventUnion.enterFrame = eventUnion.enterFrame || clipAction.events.enterFrame;
    eventUnion.unload = eventUnion.unload || clipAction.events.unload;
    eventUnion.mouseMove = eventUnion.mouseMove || clipAction.events.mouseMove;
    eventUnion.mouseDown = eventUnion.mouseDown || clipAction.events.mouseDown;
    eventUnion.mouseUp = eventUnion.mouseUp || clipAction.events.mouseUp;
    eventUnion.keyDown = eventUnion.keyDown || clipAction.events.keyDown;
    eventUnion.keyUp = eventUnion.keyUp || clipAction.events.keyUp;
    eventUnion.data = eventUnion.data || clipAction.events.data;
    eventUnion.initialize = eventUnion.initialize || clipAction.events.initialize;
    eventUnion.press = eventUnion.press || clipAction.events.press;
    eventUnion.release = eventUnion.release || clipAction.events.release;
    eventUnion.releaseOutside = eventUnion.releaseOutside || clipAction.events.releaseOutside;
    eventUnion.rollOver = eventUnion.rollOver || clipAction.events.rollOver;
    eventUnion.rollOut = eventUnion.rollOut || clipAction.events.rollOut;
    eventUnion.dragOver = eventUnion.dragOver || clipAction.events.dragOver;
    eventUnion.dragOut = eventUnion.dragOut || clipAction.events.dragOut;
    eventUnion.keyPress = eventUnion.keyPress || clipAction.events.keyPress;
    eventUnion.construct = eventUnion.construct || clipAction.events.construct;
  }

  emitClipEventFlags(byteStream, eventUnion, extendedEvents);
  for (const clipAction of value) {
    emitClipActions(byteStream, clipAction, extendedEvents);
  }
  if (extendedEvents) {
    byteStream.writeUint32LE(0);
  } else {
    byteStream.writeUint16LE(0);
  }
}

export function emitClipEventFlags(byteStream: ByteStream, value: ClipEventFlags, extendedEvents: boolean): void {
  const flags: Uint16 = 0
    | (value.load ? 1 << 0 : 0)
    | (value.enterFrame ? 1 << 1 : 0)
    | (value.unload ? 1 << 2 : 0)
    | (value.mouseMove ? 1 << 3 : 0)
    | (value.mouseDown ? 1 << 4 : 0)
    | (value.mouseUp ? 1 << 5 : 0)
    | (value.keyDown ? 1 << 6 : 0)
    | (value.keyUp ? 1 << 7 : 0)
    | (value.data ? 1 << 8 : 0)
    | (value.initialize ? 1 << 9 : 0)
    | (value.press ? 1 << 10 : 0)
    | (value.release ? 1 << 11 : 0)
    | (value.releaseOutside ? 1 << 12 : 0)
    | (value.rollOver ? 1 << 13 : 0)
    | (value.rollOut ? 1 << 14 : 0)
    | (value.dragOver ? 1 << 15 : 0);

  if (!extendedEvents) {
    byteStream.writeUint16LE(flags);
    return;
  }
  const extendedFlags: Uint32 = flags
    | (value.dragOut ? 1 << 16 : 0)
    | (value.keyPress ? 1 << 17 : 0)
    | (value.construct ? 1 << 18 : 0);
  byteStream.writeUint32LE(extendedFlags);
}

export function emitClipActions(byteStream: ByteStream, value: ClipActions, extendedEvents: boolean): void {
  emitClipEventFlags(byteStream, value.events, extendedEvents);
  const actionStream: Stream = new Stream();

  if (value.events.keyPress) {
    if (value.keyCode === undefined) {
      throw new Incident("Expected keycode");
    }
    actionStream.writeUint8(value.keyCode);
  }
  emitActionsBlock(actionStream, value.actions);

  byteStream.writeUint32LE(actionStream.bytePos);
  byteStream.write(actionStream);
}

export function emitFilterList(byteStream: ByteStream, value: Filter[]): void {
  byteStream.writeUint8(value.length);
  for (const filter of value) {
    emitFilter(byteStream, filter);
  }
}

export function emitFilter(byteStream: ByteStream, value: Filter): void {
  type FilterEmitter = [(byteStream: ByteStream, value: Filter) => void, Uint8];
  const FILTER_TYPE_TO_EMITTER: Map<FilterType, FilterEmitter> = new Map([
    [FilterType.Bevel, <FilterEmitter> [emitBevelFilter, 3]],
    [FilterType.Blur, <FilterEmitter> [emitBlurFilter, 1]],
    [FilterType.Convolution, <FilterEmitter> [emitConvolutionFilter, 5]],
    [FilterType.ColorMatrix, <FilterEmitter> [emitColorMatrixFilter, 6]],
    [FilterType.DropShadow, <FilterEmitter> [emitDropShadowFilter, 0]],
    [FilterType.Glow, <FilterEmitter> [emitGlowFilter, 2]],
    [FilterType.GradientBevel, <FilterEmitter> [emitGradientBevelFilter, 7]],
    [FilterType.GradientGlow, <FilterEmitter> [emitGradientGlowFilter, 4]],
  ]);

  const filterEmitter: FilterEmitter | undefined = FILTER_TYPE_TO_EMITTER.get(value.filter);
  if (filterEmitter === undefined) {
    throw new Incident("InvalidFilterType");
  }
  byteStream.writeUint8(filterEmitter[1]);
  filterEmitter[0](byteStream, value);
}

export function emitBevelFilter(byteStream: ByteStream, value: filters.Bevel): void {
  emitStraightSRgba8(byteStream, value.shadowColor);
  emitStraightSRgba8(byteStream, value.highlightColor);
  byteStream.writeFixed16P16LE(value.blurX);
  byteStream.writeFixed16P16LE(value.blurY);
  byteStream.writeFixed16P16LE(value.angle);
  byteStream.writeFixed16P16LE(value.distance);
  byteStream.writeFixed8P8LE(value.strength);

  const flags: Uint8 = 0
    | ((value.passes & 0x0f) << 0)
    | (value.onTop ? 1 << 4 : 0)
    | (value.compositeSource ? 1 << 5 : 0)
    | (value.knockout ? 1 << 6 : 0)
    | (value.inner ? 1 << 7 : 0);
  byteStream.writeUint8(flags);
}

export function emitBlurFilter(byteStream: ByteStream, value: filters.Blur): void {
  byteStream.writeFixed16P16LE(value.blurX);
  byteStream.writeFixed16P16LE(value.blurY);
  const flags: Uint8 = 0
    | ((value.passes & 0x1f) << 3);
  byteStream.writeUint8(flags);
}

export function emitColorMatrixFilter(byteStream: ByteStream, value: filters.ColorMatrix): void {
  for (const coefficient of value.matrix) {
    byteStream.writeFloat32BE(coefficient);
  }
}

export function emitConvolutionFilter(byteStream: ByteStream, value: filters.Convolution): void {
  byteStream.writeUint8(value.matrixWidth);
  byteStream.writeUint8(value.matrixHeight);
  byteStream.writeFloat32BE(value.divisor);
  byteStream.writeFloat32BE(value.bias);
  for (const coefficient of value.matrix) {
    byteStream.writeFloat32BE(coefficient);
  }
  emitStraightSRgba8(byteStream, value.defaultColor);
  const flags: Uint8 = 0
    | (value.preserveAlpha ? 1 << 0 : 0)
    | (value.clamp ? 1 << 1 : 0);
  byteStream.writeUint8(flags);
}

export function emitDropShadowFilter(byteStream: ByteStream, value: filters.DropShadow): void {
  emitStraightSRgba8(byteStream, value.color);
  byteStream.writeFixed16P16LE(value.blurX);
  byteStream.writeFixed16P16LE(value.blurY);
  byteStream.writeFixed16P16LE(value.angle);
  byteStream.writeFixed16P16LE(value.distance);
  byteStream.writeFixed8P8LE(value.strength);

  const flags: Uint8 = 0
    | ((value.passes & 0x1f) << 0)
    | (value.compositeSource ? 1 << 5 : 0)
    | (value.knockout ? 1 << 6 : 0)
    | (value.inner ? 1 << 7 : 0);
  byteStream.writeUint8(flags);
}

export function emitGlowFilter(byteStream: ByteStream, value: filters.Glow): void {
  emitStraightSRgba8(byteStream, value.color);
  byteStream.writeFixed16P16LE(value.blurX);
  byteStream.writeFixed16P16LE(value.blurY);
  byteStream.writeFixed8P8LE(value.strength);

  const flags: Uint8 = 0
    | ((value.passes & 0x1f) << 0)
    | (value.compositeSource ? 1 << 5 : 0)
    | (value.knockout ? 1 << 6 : 0)
    | (value.inner ? 1 << 7 : 0);
  byteStream.writeUint8(flags);
}

export function emitGradientBevelFilter(byteStream: ByteStream, value: filters.GradientBevel): void {
  byteStream.writeUint8(value.gradient.length);
  for (const colorStop of value.gradient) {
    emitStraightSRgba8(byteStream, colorStop.color);
  }
  for (const colorStop of value.gradient) {
    byteStream.writeUint8(colorStop.ratio);
  }
  byteStream.writeFixed16P16LE(value.blurX);
  byteStream.writeFixed16P16LE(value.blurY);
  byteStream.writeFixed16P16LE(value.angle);
  byteStream.writeFixed16P16LE(value.distance);
  byteStream.writeFixed8P8LE(value.strength);

  const flags: Uint8 = 0
    | ((value.passes & 0x0f) << 0)
    | (value.onTop ? 1 << 4 : 0)
    | (value.compositeSource ? 1 << 5 : 0)
    | (value.knockout ? 1 << 6 : 0)
    | (value.inner ? 1 << 7 : 0);
  byteStream.writeUint8(flags);
}

export function emitGradientGlowFilter(byteStream: ByteStream, value: filters.GradientGlow): void {
  byteStream.writeUint8(value.gradient.length);
  for (const colorStop of value.gradient) {
    emitStraightSRgba8(byteStream, colorStop.color);
  }
  for (const colorStop of value.gradient) {
    byteStream.writeUint8(colorStop.ratio);
  }
  byteStream.writeFixed16P16LE(value.blurX);
  byteStream.writeFixed16P16LE(value.blurY);
  byteStream.writeFixed16P16LE(value.angle);
  byteStream.writeFixed16P16LE(value.distance);
  byteStream.writeFixed8P8LE(value.strength);

  const flags: Uint8 = 0
    | ((value.passes & 0x0f) << 0)
    | (value.onTop ? 1 << 4 : 0)
    | (value.compositeSource ? 1 << 5 : 0)
    | (value.knockout ? 1 << 6 : 0)
    | (value.inner ? 1 << 7 : 0);
  byteStream.writeUint8(flags);
}
