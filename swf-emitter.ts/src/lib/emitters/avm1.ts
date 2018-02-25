import { Incident } from "incident";
import { Uint16, Uint2, Uint8 } from "semantic-types";
import { avm1 } from "swf-tree";
import { ByteStream, Stream } from "../stream";

export interface ActionHeader {
  actionCode: Uint8;
  length: Uint16;
}

export function emitActionHeader(byteStream: ByteStream, value: ActionHeader): void {
  byteStream.writeUint8(value.actionCode);
  if (value.length > 0) {
    byteStream.writeUint16LE(value.length);
  }
}

export function emitActionsString(byteStream: ByteStream, value: avm1.Action[]): void {
  emitActionsBlock(byteStream, value);
  byteStream.writeUint8(0);
}

export function emitActionsBlock(byteStream: ByteStream, value: avm1.Action[]): void {
  for (const action of value) {
    emitAction(byteStream, action);
  }
}

// tslint:disable-next-line:cyclomatic-complexity
export function emitAction(byteStream: ByteStream, value: avm1.Action): void {
  type ActionEmitter = number | [(byteStream: ByteStream, value: avm1.Action) => void, number];

  const ACTION_TYPE_TO_EMITTER: Map<avm1.ActionType, ActionEmitter> = new Map<avm1.ActionType, ActionEmitter>(<any[]> [
    [avm1.ActionType.Add, 0x0a],
    [avm1.ActionType.Add2, 0x47],
    [avm1.ActionType.And, 0x10],
    [avm1.ActionType.AsciiToChar, 0x33],
    [avm1.ActionType.BitAnd, 0x60],
    [avm1.ActionType.BitLShift, 0x63],
    [avm1.ActionType.BitOr, 0x61],
    [avm1.ActionType.BitRShift, 0x64],
    [avm1.ActionType.BitURShift, 0x65],
    [avm1.ActionType.BitXor, 0x62],
    [avm1.ActionType.Call, 0x9e],
    [avm1.ActionType.CallFunction, 0x3d],
    [avm1.ActionType.CallMethod, 0x52],
    [avm1.ActionType.CastOp, 0x2b],
    [avm1.ActionType.CharToAscii, 0x32],
    [avm1.ActionType.CloneSprite, 0x24],
    [avm1.ActionType.ConstantPool, [emitConstantPoolAction, 0x88]],
    [avm1.ActionType.Decrement, 0x51],
    [avm1.ActionType.DefineFunction, [emitDefineFunctionAction, 0x9b]],
    [avm1.ActionType.DefineFunction2, [emitDefineFunction2Action, 0x8e]],
    [avm1.ActionType.DefineLocal, 0x3c],
    [avm1.ActionType.DefineLocal2, 0x41],
    [avm1.ActionType.Delete, 0x3a],
    [avm1.ActionType.Delete2, 0x3b],
    [avm1.ActionType.Divide, 0x0d],
    [avm1.ActionType.EndDrag, 0x28],
    [avm1.ActionType.Enumerate, 0x46],
    [avm1.ActionType.Enumerate2, 0x55],
    [avm1.ActionType.Equals, 0x0e],
    [avm1.ActionType.Equals2, 0x49],
    [avm1.ActionType.Extends, 0x69],
    [avm1.ActionType.FsCommand2, 0x2d],
    [avm1.ActionType.GetMember, 0x4e],
    [avm1.ActionType.GetProperty, 0x22],
    [avm1.ActionType.GetTime, 0x34],
    [avm1.ActionType.GetUrl, [emitGetUrlAction, 0x83]],
    [avm1.ActionType.GetUrl2, [emitGetUrl2Action, 0x9a]],
    [avm1.ActionType.GetVariable, 0x1c],
    [avm1.ActionType.GotoFrame, [emitGotoFrameAction, 0x81]],
    [avm1.ActionType.GotoFrame2, [emitGotoFrame2Action, 0x9f]],
    [avm1.ActionType.GotoLabel, [emitGotoLabelAction, 0x8c]],
    [avm1.ActionType.Greater, 0x67],
    [avm1.ActionType.If, [emitIfAction, 0x9d]],
    [avm1.ActionType.ImplementsOp, 0x2c],
    [avm1.ActionType.Increment, 0x50],
    [avm1.ActionType.InitArray, 0x42],
    [avm1.ActionType.InitObject, 0x43],
    [avm1.ActionType.InstanceOf, 0x54],
    [avm1.ActionType.Jump, [emitJumpAction, 0x99]],
    [avm1.ActionType.Less, 0x0f],
    [avm1.ActionType.Less2, 0x48],
    [avm1.ActionType.MbAsciiToChar, 0x37],
    [avm1.ActionType.MbCharToAscii, 0x36],
    [avm1.ActionType.MbStringExtract, 0x35],
    [avm1.ActionType.MbStringLength, 0x31],
    [avm1.ActionType.Modulo, 0x3f],
    [avm1.ActionType.Multiply, 0x0c],
    [avm1.ActionType.NewMethod, 0x53],
    [avm1.ActionType.NewObject, 0x40],
    [avm1.ActionType.NextFrame, 0x04],
    [avm1.ActionType.Not, 0x12],
    [avm1.ActionType.Or, 0x11],
    [avm1.ActionType.Play, 0x06],
    [avm1.ActionType.Pop, 0x17],
    [avm1.ActionType.PreviousFrame, 0x05],
    [avm1.ActionType.Push, [emitPushAction, 0x96]],
    [avm1.ActionType.PushDuplicate, 0x4c],
    [avm1.ActionType.RandomNumber, 0x30],
    [avm1.ActionType.Return, 0x3e],
    [avm1.ActionType.SetMember, 0x4f],
    [avm1.ActionType.SetProperty, 0x23],
    [avm1.ActionType.SetTarget, [emitSetTargetAction, 0x8b]],
    [avm1.ActionType.SetTarget2, 0x20],
    [avm1.ActionType.SetVariable, 0x1d],
    [avm1.ActionType.StackSwap, 0x4d],
    [avm1.ActionType.StartDrag, 0x27],
    [avm1.ActionType.Stop, 0x07],
    [avm1.ActionType.StopSounds, 0x09],
    [avm1.ActionType.StoreRegister, [emitStoreRegisterAction, 0x87]],
    [avm1.ActionType.StrictEquals, 0x66],
    [avm1.ActionType.StringAdd, 0x21],
    [avm1.ActionType.StringEquals, 0x13],
    [avm1.ActionType.StringExtract, 0x15],
    [avm1.ActionType.StringGreater, 0x68],
    [avm1.ActionType.StringLength, 0x14],
    [avm1.ActionType.StringLess, 0x29],
    [avm1.ActionType.Subtract, 0x0b],
    [avm1.ActionType.TargetPath, 0x45],
    [avm1.ActionType.Throw, 0x2a],
    [avm1.ActionType.ToInteger, 0x18],
    [avm1.ActionType.ToNumber, 0x4a],
    [avm1.ActionType.ToString, 0x4b],
    [avm1.ActionType.ToggleQuality, 0x08],
    [avm1.ActionType.Trace, 0x26],
    [avm1.ActionType.Try, [emitTryAction, 0x8f]],
    [avm1.ActionType.TypeOf, 0x44],
    [avm1.ActionType.WaitForFrame, [emitWaitForFrameAction, 0x8a]],
    [avm1.ActionType.WaitForFrame2, [emitWaitForFrame2Action, 0x8d]],
    [avm1.ActionType.With, [emitWithAction, 0x94]],
  ]);

  const actionEmitter: ActionEmitter | undefined = ACTION_TYPE_TO_EMITTER.get(value.action);

  if (actionEmitter === undefined) {
    throw new Incident("UnexpectedAction");
  }

  if (typeof actionEmitter === "number") {
    emitActionHeader(byteStream, {actionCode: actionEmitter, length: 0});
    return;
  }

  const actionStream: Stream = new Stream();
  actionEmitter[0](actionStream, value);
  emitActionHeader(byteStream, {actionCode: actionEmitter[1], length: actionStream.bytePos});
  byteStream.write(actionStream);
}

export function emitGotoFrameAction(byteStream: ByteStream, value: avm1.actions.GotoFrame): void {
  byteStream.writeUint16LE(value.frame);
}

export function emitGetUrlAction(byteStream: ByteStream, value: avm1.actions.GetUrl): void {
  byteStream.writeCString(value.url);
  byteStream.writeCString(value.target);
}

export function emitStoreRegisterAction(byteStream: ByteStream, value: avm1.actions.StoreRegister): void {
  byteStream.writeUint8(value.registerNumber);
}

export function emitConstantPoolAction(byteStream: ByteStream, value: avm1.actions.ConstantPool): void {
  byteStream.writeUint16LE(value.constantPool.length);
  for (const constant of value.constantPool) {
    byteStream.writeCString(constant);
  }
}

export function emitWaitForFrameAction(byteStream: ByteStream, value: avm1.actions.WaitForFrame): void {
  byteStream.writeUint16LE(value.frame);
  byteStream.writeUint8(value.skipCount);
}

export function emitSetTargetAction(byteStream: ByteStream, value: avm1.actions.SetTarget): void {
  byteStream.writeCString(value.targetName);
}

export function emitGotoLabelAction(byteStream: ByteStream, value: avm1.actions.GotoLabel): void {
  byteStream.writeCString(value.label);
}

export function emitWaitForFrame2Action(byteStream: ByteStream, value: avm1.actions.WaitForFrame2): void {
  byteStream.writeUint8(value.skipCount);
}

export function emitDefineFunction2Action(byteStream: ByteStream, value: avm1.actions.DefineFunction2): void {
  byteStream.writeCString(value.name);
  byteStream.writeUint16LE(value.parameters.length);
  byteStream.writeUint8(value.registerCount);

  const flags: Uint16 = 0
    | (value.preloadThis ? 1 << 0 : 0)
    | (value.suppressThis ? 1 << 1 : 0)
    | (value.preloadArguments ? 1 << 2 : 0)
    | (value.suppressArguments ? 1 << 3 : 0)
    | (value.preloadSuper ? 1 << 4 : 0)
    | (value.suppressSuper ? 1 << 5 : 0)
    | (value.preloadRoot ? 1 << 6 : 0)
    | (value.preloadParent ? 1 << 7 : 0)
    | (value.preloadGlobal ? 1 << 8 : 0);
  byteStream.writeUint16LE(flags);

  for (const parameter of value.parameters) {
    byteStream.writeUint8(parameter.register);
    byteStream.writeCString(parameter.name);
  }

  const bodyStream: Stream = new Stream();
  emitActionsBlock(bodyStream, value.body);

  byteStream.writeUint16LE(bodyStream.bytePos);
  byteStream.write(bodyStream);
}

function emitCatchTarget(byteStream: ByteStream, value: avm1.CatchTarget): void {
  if (value.type === avm1.CatchTargetType.Register) {
    byteStream.writeUint8(value.register);
  } else {
    byteStream.writeCString(value.variable);
  }
}

export function emitTryAction(byteStream: ByteStream, value: avm1.actions.Try): void {
  const catchInRegister: boolean = value.catchTarget !== undefined
    && value.catchTarget.type === avm1.CatchTargetType.Register;

  const flags: Uint8 = 0
    | (value.catch !== undefined ? 1 << 0 : 0)
    | (value.finally !== undefined ? 1 << 1 : 0)
    | (catchInRegister ? 1 << 2 : 0);
  // (Skip 5 bits)
  byteStream.writeUint8(flags);

  const tryStream: Stream = new Stream();
  let catchStream: Stream | undefined = undefined;
  let finallyStream: Stream | undefined = undefined;

  emitActionsBlock(tryStream, value.try);
  if (value.catch !== undefined) {
    catchStream = new Stream();
    emitActionsBlock(catchStream, value.catch);
  }
  if (value.finally !== undefined) {
    finallyStream = new Stream();
    emitActionsBlock(finallyStream, value.finally);
  }

  byteStream.writeUint16LE(tryStream.bytePos);
  byteStream.writeUint16LE(finallyStream !== undefined ? finallyStream.bytePos : 0);
  byteStream.writeUint16LE(catchStream !== undefined ? catchStream.bytePos : 0);
  emitCatchTarget(byteStream, value.catchTarget);
  byteStream.write(tryStream);
  if (catchStream !== undefined) {
    byteStream.write(catchStream);
  }
  if (finallyStream !== undefined) {
    byteStream.write(finallyStream);
  }
}

export function emitWithAction(byteStream: ByteStream, value: avm1.actions.With): void {
  const withStream: Stream = new Stream();
  emitActionsBlock(withStream, value.with);
  byteStream.writeUint16LE(withStream.bytePos);
  byteStream.write(withStream);
}

export function emitPushAction(byteStream: ByteStream, value: avm1.actions.Push): void {
  for (const pushed of value.values) {
    emitActionValue(byteStream, pushed);
  }
}

export function emitActionValue(byteStream: ByteStream, value: avm1.Value): void {
  switch (value.type) {
    case avm1.ValueType.Boolean:
      byteStream.writeUint8(5);
      byteStream.writeUint8(value.value ? 1 : 0);
      break;
    case avm1.ValueType.Constant:
      if (value.value > 0xff) {
        byteStream.writeUint8(9);
        byteStream.writeUint16LE(value.value);
      } else {
        byteStream.writeUint8(8);
        byteStream.writeUint8(value.value as Uint8);
      }
      break;
    case avm1.ValueType.CString:
      byteStream.writeUint8(0);
      byteStream.writeCString(value.value);
      break;
    case avm1.ValueType.Int32:
      byteStream.writeUint8(7);
      byteStream.writeSint32LE(value.value);
      break;
    case avm1.ValueType.Float32:
      byteStream.writeUint8(1);
      byteStream.writeFloat32LE(value.value);
      break;
    case avm1.ValueType.Float64:
      byteStream.writeUint8(6);
      byteStream.writeFloat64LE(value.value);
      break;
    case avm1.ValueType.Null:
      byteStream.writeUint8(2);
      break;
    case avm1.ValueType.Register:
      byteStream.writeUint8(4);
      byteStream.writeUint8(value.value);
      break;
    case avm1.ValueType.Undefined:
      byteStream.writeUint8(3);
      break;
    default:
      throw new Incident("UnexpectedValueType");
  }
}

export function emitJumpAction(byteStream: ByteStream, value: avm1.actions.Jump): void {
  byteStream.writeUint16LE(value.offset);
}

export function emitGetUrl2Action(byteStream: ByteStream, value: avm1.actions.GetUrl2): void {
  const METHOD_TO_CODE: Map<avm1.GetUrl2Method, Uint2> = new Map([
    [avm1.GetUrl2Method.None, 0 as Uint2],
    [avm1.GetUrl2Method.Get, 1 as Uint2],
    [avm1.GetUrl2Method.Post, 2 as Uint2],
  ]);
  const methodCode: Uint2 | undefined = METHOD_TO_CODE.get(value.method);
  if (methodCode === undefined) {
    throw new Incident("UnexpectedGetUrl2Method");
  }

  const flags: Uint8 = 0
    | (value.loadVariables ? 1 << 0 : 0)
    | (value.loadTarget ? 1 << 1 : 0)
    | (methodCode << 6);

  byteStream.writeUint8(flags);
}

export function emitDefineFunctionAction(byteStream: ByteStream, value: avm1.actions.DefineFunction): void {
  byteStream.writeCString(value.name);
  byteStream.writeUint16LE(value.parameters.length);
  for (const parameter of value.parameters) {
    byteStream.writeCString(parameter);
  }

  const bodyStream: Stream = new Stream();
  emitActionsBlock(bodyStream, value.body);

  byteStream.writeUint16LE(bodyStream.bytePos);
  byteStream.write(bodyStream);
}

export function emitIfAction(byteStream: ByteStream, value: avm1.actions.If): void {
  byteStream.writeUint16LE(value.offset);
}

export function emitGotoFrame2Action(byteStream: ByteStream, value: avm1.actions.GotoFrame2): void {
  const flags: Uint8 = 0
    | (value.sceneBias !== 0 ? 1 << 0 : 0)
    | (value.play ? 1 << 1 : 0);
  // Skip 6 bits
  if (value.sceneBias !== 0) {
    byteStream.writeUint16LE(value.sceneBias);
  }
}
