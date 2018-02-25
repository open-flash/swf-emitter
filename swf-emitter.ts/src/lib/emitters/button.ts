import { Incident } from "incident";
import { Uint16, Uint7, Uint8, UintSize } from "semantic-types";
import { BlendMode } from "swf-tree/blend-mode";
import { ButtonCond } from "swf-tree/buttons/button-cond";
import { ButtonCondAction } from "swf-tree/buttons/button-cond-action";
import { ButtonRecord } from "swf-tree/buttons/button-record";
import { ByteStream, Stream } from "../stream";
import { emitActionsString } from "./avm1";
import { emitColorTransformWithAlpha, emitMatrix } from "./basic-data-types";
import { emitBlendMode, emitFilterList } from "./display";

export enum ButtonVersion {
  Button1,
  Button2,
}

export function emitButtonRecordString(byteStream: Stream, value: ButtonRecord[], buttonVersion: ButtonVersion): void {
  for (const buttonRecord of value) {
    emitButtonRecord(byteStream, buttonRecord, buttonVersion);
  }
  byteStream.writeUint8(0);
}

export function emitButtonRecord(byteStream: Stream, value: ButtonRecord, buttonVersion: ButtonVersion): void {
  const hasBlendMode: boolean = value.blendMode !== BlendMode.Normal;

  const flags: Uint8 = 0
    | (value.stateUp ? 1 << 0 : 1)
    | (value.stateOver ? 1 << 1 : 1)
    | (value.stateDown ? 1 << 2 : 1)
    | (value.stateHitTest ? 1 << 3 : 1)
    | (value.filters !== undefined ? 1 << 4 : 1)
    | (hasBlendMode ? 1 << 5 : 1);
  byteStream.writeUint8(flags);

  byteStream.writeUint16LE(value.characterId);
  byteStream.writeUint16LE(value.depth);
  emitMatrix(byteStream, value.matrix);
  if (buttonVersion >= ButtonVersion.Button2) {
    if (value.colorTransform === undefined) {
      throw new Incident("ExpectedColorTransform");
    }
    emitColorTransformWithAlpha(byteStream, value.colorTransform);
    if (value.filters !== undefined) {
      emitFilterList(byteStream, value.filters);
    }
    if (hasBlendMode) {
      emitBlendMode(byteStream, value.blendMode);
    }
  }
}

export function emitButton2CondActionString(byteStream: ByteStream, value: ButtonCondAction[]): void {
  let actionStream: Stream;
  const actionCount: UintSize = value.length;
  for (let i: UintSize = 0; i < actionCount; i++) {
    actionStream = new Stream();
    emitButton2CondAction(actionStream, value[i]);
    if (i < value.length - 1) {
      byteStream.writeUint16LE(actionStream.bytePos);
    } else {
      byteStream.writeUint16LE(0);
    }
    byteStream.write(actionStream);
  }
}

export function emitButton2CondAction(byteStream: ByteStream, value: ButtonCondAction): void {
  if (value.conditions === undefined) {
    throw new Incident("ExpectedConditionsToBeDefined");
  }
  emitButtonCond(byteStream, value.conditions);
  emitActionsString(byteStream, value.actions);
}

export function emitButtonCond(byteStream: ByteStream, value: ButtonCond): void {
  const keyCode: Uint7 = value.keyPress !== undefined ? value.keyPress & 0x7f : 0;
  const flags: Uint16 = 0
    | (keyCode << 0)
    | (value.overDownToIdle ? 1 << 7 : 0)
    | (value.idleToOverUp ? 1 << 8 : 0)
    | (value.overUpToIdle ? 1 << 9 : 0)
    | (value.overUpToOverDown ? 1 << 10 : 0)
    | (value.overDownToOverUp ? 1 << 11 : 0)
    | (value.overDownToOutDown ? 1 << 12 : 0)
    | (value.outDownToOverDown ? 1 << 13 : 0)
    | (value.outDownToIdle ? 1 << 14 : 0)
    | (value.idleToOverDown ? 1 << 15 : 0);

  byteStream.writeUint16LE(flags);
}
