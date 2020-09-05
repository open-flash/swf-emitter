import stream, { WritableByteStream } from "@open-flash/stream";
import incident from "incident";
import { Uint16, Uint7, Uint8, UintSize } from "semantic-types";
import { BlendMode } from "swf-types/lib/blend-mode.js";
import { ButtonCond } from "swf-types/lib/button/button-cond.js";
import { ButtonCondAction } from "swf-types/lib/button/button-cond-action.js";
import { ButtonRecord } from "swf-types/lib/button/button-record.js";
import { ButtonSound } from "swf-types/lib/button/button-sound.js";
import {
  $ColorTransformWithAlpha,
  ColorTransformWithAlpha,
} from "swf-types/lib/color-transform-with-alpha.js";
import { Sfixed8P8 } from "swf-types/lib/fixed-point/sfixed8p8.js";
import { DefineButton } from "swf-types/lib/tags/define-button.js";
import { emitColorTransformWithAlpha, emitMatrix } from "./basic-data-types.js";
import { emitBlendMode, emitFilterList } from "./display.js";
import { emitSoundInfo } from "./sound.js";

export enum ButtonVersion {
  Button1,
  Button2,
}

export function getMinButtonVersion(value: DefineButton): ButtonVersion {
  if (value.trackAsMenu) {
    return ButtonVersion.Button2;
  }
  for (const record of value.records) {
    const DEFAULT_COLOR_TRANSFORM: ColorTransformWithAlpha = {
      redMult: Sfixed8P8.fromValue(1),
      greenMult: Sfixed8P8.fromValue(1),
      blueMult: Sfixed8P8.fromValue(1),
      alphaMult: Sfixed8P8.fromValue(1),
      redAdd: 0,
      greenAdd: 0,
      blueAdd: 0,
      alphaAdd: 0,
    };
    const isDefaultColorTransform: boolean = record.colorTransform === undefined
      || $ColorTransformWithAlpha.equals(record.colorTransform, DEFAULT_COLOR_TRANSFORM);

    if (!isDefaultColorTransform || record.filters.length > 0 || record.blendMode !== BlendMode.Normal) {
      return ButtonVersion.Button2;
    }
  }

  if (value.actions.length !== 1) {
    return ButtonVersion.Button2;
  }
  const action: ButtonCondAction = value.actions[0];
  if (action.conditions !== undefined) {
    return ButtonVersion.Button2;
  }
  return ButtonVersion.Button1;
}

export function emitButtonRecordString(
  byteStream: WritableByteStream,
  value: ReadonlyArray<ButtonRecord>,
  buttonVersion: ButtonVersion,
): void {
  for (const buttonRecord of value) {
    emitButtonRecord(byteStream, buttonRecord, buttonVersion);
  }
  byteStream.writeUint8(0);
}

export function emitButtonRecord(
  byteStream: WritableByteStream,
  value: ButtonRecord,
  buttonVersion: ButtonVersion,
): void {
  const hasFilters: boolean = value.filters.length > 0;
  const hasBlendMode: boolean = value.blendMode !== BlendMode.Normal;

  const flags: Uint8 = 0
    | (value.stateUp ? 1 << 0 : 0)
    | (value.stateOver ? 1 << 1 : 0)
    | (value.stateDown ? 1 << 2 : 0)
    | (value.stateHitTest ? 1 << 3 : 0)
    | (hasFilters ? 1 << 4 : 0)
    | (hasBlendMode ? 1 << 5 : 0);
  // Skip bits [6, 7]
  byteStream.writeUint8(flags);

  byteStream.writeUint16LE(value.characterId);
  byteStream.writeUint16LE(value.depth);
  emitMatrix(byteStream, value.matrix);
  if (buttonVersion >= ButtonVersion.Button2) {
    if (value.colorTransform === undefined) {
      throw new incident.Incident("ExpectedColorTransform");
    }
    emitColorTransformWithAlpha(byteStream, value.colorTransform);
    if (hasFilters) {
      emitFilterList(byteStream, value.filters);
    }
    if (hasBlendMode) {
      emitBlendMode(byteStream, value.blendMode);
    }
  }
}

export function emitButton2CondActionString(
  byteStream: WritableByteStream,
  value: ReadonlyArray<ButtonCondAction>,
): void {
  for (let i: UintSize = 0; i < value.length; i++) {
    const actionStream: stream.WritableStream = new stream.WritableStream();
    emitButton2CondAction(actionStream, value[i]);
    if (i < value.length - 1) { // !isLast
      byteStream.writeUint16LE(actionStream.bytePos);
    } else { // isLast
      byteStream.writeUint16LE(0);
    }
    byteStream.write(actionStream);
  }
}

export function emitButton2CondAction(
  byteStream: WritableByteStream,
  value: ButtonCondAction,
): void {
  if (value.conditions === undefined) {
    throw new incident.Incident("ExpectedConditionsToBeDefined");
  }
  emitButtonCond(byteStream, value.conditions);
  byteStream.writeBytes(value.actions);
}

export function emitButtonCond(byteStream: WritableByteStream, value: ButtonCond): void {
  const keyCode: Uint7 = value.keyPress !== undefined ? value.keyPress & 0x7f : 0;
  const flags: Uint16 = 0
    | (value.idleToOverUp ? 1 << 0 : 0)
    | (value.overUpToIdle ? 1 << 1 : 0)
    | (value.overUpToOverDown ? 1 << 2 : 0)
    | (value.overDownToOverUp ? 1 << 3 : 0)
    | (value.overDownToOutDown ? 1 << 4 : 0)
    | (value.outDownToOverDown ? 1 << 5 : 0)
    | (value.outDownToIdle ? 1 << 6 : 0)
    | (value.idleToOverDown ? 1 << 7 : 0)
    | (value.overDownToIdle ? 1 << 8 : 0)
    | (keyCode << 9);

  byteStream.writeUint16LE(flags);
}

export function emitButtonSound(byteStream: WritableByteStream, value: ButtonSound | undefined): void {
  if (value === undefined) {
    byteStream.writeUint16LE(0);
  } else {
    if (value.soundId === 0) {
      throw new Error("InvalidSoundId");
    }
    byteStream.writeUint16LE(value.soundId);
    emitSoundInfo(byteStream, value.soundInfo);
  }
}
