import { WritableStream } from "@open-flash/stream";
import chai from "chai";
import fs from "fs";
import { JsonReader } from "kryo/readers/json";
import sysPath from "path";
import { $Tag, Tag } from "swf-tree/tag";
import { emitTag } from "../lib/emitters/tags";
import meta from "./meta.js";

export const TAGS_DIR: string = sysPath.join(meta.dirname, "tags");
const JSON_READER: JsonReader = new JsonReader();

describe("Tags", function () {
  for (const dirEnt of fs.readdirSync(TAGS_DIR, {withFileTypes: true})) {
    if (!dirEnt.isFile() || !/\.input\.json$/.test(dirEnt.name)) {
      continue;
    }
    const baseName: string = dirEnt.name.replace(/\.input\.json$/, "");
    const inputPath: string = sysPath.join(TAGS_DIR, `${baseName}.input.json`);
    const expectedPath: string = sysPath.join(TAGS_DIR, `${baseName}.expected.bin`);

    it(baseName, function (this: Mocha.Context) {
      const inputTag: Tag = $Tag.read(JSON_READER, fs.readFileSync(inputPath, {encoding: "UTF-8"}));
      const expectedBytes: Uint8Array = new Uint8Array(fs.readFileSync(expectedPath));
      const emitterStream: WritableStream = new WritableStream();
      emitTag(emitterStream, inputTag, 8);
      const actualBytes: Uint8Array = emitterStream.getBytes();

      chai.assert.deepEqual([...actualBytes], [...expectedBytes]);
    });
  }
});
