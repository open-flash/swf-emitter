import stream, { WritableByteStream } from "@open-flash/stream";
import chai from "chai";
import fs from "fs";
import { IoType } from "kryo";
import { JSON_READER } from "kryo-json/lib/json-reader.js";
import { Float64Type } from "kryo/lib/float64.js";
import { $Uint32 } from "kryo/lib/integer.js";
import sysPath from "path";
import { Float32, Uint32 } from "semantic-types";
import { $ColorTransformWithAlpha } from "swf-types/lib/color-transform-with-alpha.js";
import { $Header } from "swf-types/lib/header.js";
import { $Matrix } from "swf-types/lib/matrix.js";
import { $Rect } from "swf-types/lib/rect.js";
import { $SwfSignature } from "swf-types/lib/swf-signature.js";

import { emitColorTransformWithAlpha, emitMatrix, emitRect } from "../lib/emitters/basic-data-types.js";
import { emitHeader, emitSwfSignature } from "../lib/emitters/movie.js";
import meta from "./meta.js";
import { prettyPrintBytes, readFile, readTextFile } from "./utils.js";

const PROJECT_ROOT: string = sysPath.join(meta.dirname, "..");
const SAMPLES_ROOT: string = sysPath.join(PROJECT_ROOT, "..", "tests", "various");

for (const group of getSampleGroups()) {
  describe(group.name, function () {
    for (const sample of getSamplesFromGroup(group.name)) {
      it(sample.name, async function () {
        const valueJson: string = await readTextFile(sample.valuePath);
        const value: any = group.type.read(JSON_READER, valueJson);
        const s: WritableByteStream = new stream.WritableStream();
        group.emitter(s, value);
        const actualBytes: Uint8Array = s.getBytes();

        const expectedBytes: Uint8Array = await readFile(sample.outputPath);

        try {
          chai.assert.deepEqual(actualBytes, expectedBytes);
        } catch (err) {
          chai.assert.strictEqual(prettyPrintBytes(actualBytes), prettyPrintBytes(expectedBytes));
          throw err;
        }
      });
    }
  });
}

interface SampleGroup<T> {
  name: string;
  type: IoType<T>;

  emitter(byteStream: WritableByteStream, value: T): void;
}

function* getSampleGroups(): IterableIterator<SampleGroup<any>> {
  for (const dirEnt of fs.readdirSync(SAMPLES_ROOT, {withFileTypes: true})) {
    if (!dirEnt.isDirectory()) {
      continue;
    }
    const name: string = dirEnt.name;
    switch (name) {
      case "color-transform-with-alpha": {
        yield {name, emitter: emitColorTransformWithAlpha, type: $ColorTransformWithAlpha};
        break;
      }
      case "float16-le": {
        yield {
          name,
          emitter: (stream: WritableByteStream, value: Float32) => stream.writeFloat16LE(value),
          type: new Float64Type(),
        };
        break;
      }
      case "header": {
        yield {name, emitter: emitHeader, type: $Header};
        break;
      }
      case "matrix": {
        yield {name, emitter: emitMatrix, type: $Matrix};
        break;
      }
      case "rect": {
        yield {name, emitter: emitRect, type: $Rect};
        break;
      }
      case "swf-signature": {
        yield {name, emitter: emitSwfSignature, type: $SwfSignature};
        break;
      }
      case "uint32-leb128": {
        yield {
          name,
          emitter: (stream: WritableByteStream, value: Uint32) => stream.writeUint32Leb128(value),
          type: $Uint32,
        };
        break;
      }
      default:
        throw new Error(`Unknown sample group: ${name}`);
    }
  }
}

interface Sample {
  name: string;
  outputPath: string;
  valuePath: string;
}

function* getSamplesFromGroup(group: string): IterableIterator<Sample> {
  const groupPath: string = sysPath.join(SAMPLES_ROOT, group);
  for (const dirEnt of fs.readdirSync(groupPath, {withFileTypes: true})) {
    if (!dirEnt.isDirectory()) {
      continue;
    }
    const testName: string = dirEnt.name;
    const testPath: string = sysPath.join(groupPath, testName);

    const outputPath: string = fs.existsSync(sysPath.join(testPath, "output.bytes"))
      ? sysPath.join(testPath, "output.bytes")
      : sysPath.join(testPath, "input.bytes");
    const valuePath: string = sysPath.join(testPath, "value.json");

    yield {name: testName, outputPath, valuePath};
  }
}
