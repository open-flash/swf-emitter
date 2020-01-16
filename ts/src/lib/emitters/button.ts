import { WritableByteStream, WritableStream } from "@open-flash/stream";
import { Incident } from "incident";
import { Uint16, Uint7, Uint8, UintSize } from "semantic-types";
import { BlendMode } from "swf-types/blend-mode";
import { ButtonCond } from "swf-types/button/button-cond";
import { ButtonCondAction } from "swf-types/button/button-cond-action";
import { ButtonRecord } from "swf-types/button/button-record";
import { emitColorTransformWithAlpha, emitMatrix } from "./basic-data-types";
import { emitBlendMode, emitFilterList } from "./display";

export enum ButtonVersion {
  Button1,
  Button2,
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
      throw new Incident("ExpectedColorTransform");
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
    const actionStream: WritableStream = new WritableStream();
    emitButton2CondAction(actionStream, value[i]);
    if (i < value.length - 1) { // !isLast
      byteStream.writeUint16LE(actionStream.bytePos);
    } else { // isLast
      byteStream.writeUint16LE(0);
    }
    byteStream.write(actionStream);
  }
}

export function emitButton2CondAction(byteStream: WritableByteStream, value: ButtonCondAction): void {
  if (value.conditions === undefined) {
    throw new Incident("ExpectedConditionsToBeDefined");
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
