import chai from "chai";
import fs from "fs";
import sysPath from "path";
import { parseMovie } from "swf-parser/parsers/movie";
import { Stream as ParserStream } from "swf-parser/stream";
import { CompressionMethod, Movie } from "swf-tree";
import { $Movie } from "swf-tree/movie";
import { emitMovie } from "../lib/emitters/movie";
import { Stream as EmitterStream } from "../lib/stream";
import meta from "./meta.js";

export const END_TO_END_DIR: string = sysPath.join(meta.dirname, "end-to-end");

describe("End-to-end", function () {
  for (const dirEnt of fs.readdirSync(END_TO_END_DIR, {withFileTypes: true})) {
    if (!dirEnt.isFile() || !/^game\.swf$/.test(dirEnt.name)) {
      continue;
    }
    it(dirEnt.name, function (this: Mocha.Context) {
      this.timeout(30 * 1000);

      const filePath: string = sysPath.join(END_TO_END_DIR, dirEnt.name);
      const inputBuffer: Uint8Array = fs.readFileSync(filePath);

      console.log("start");

      const inputMovie: Movie = parseMovie(new ParserStream(inputBuffer));

      console.log("input is parsed");

      const emitterStream: EmitterStream = new EmitterStream();
      emitMovie(emitterStream, inputMovie, CompressionMethod.None);
      const outputBuffer: Uint8Array = emitterStream.getBytes();

      fs.writeFileSync(sysPath.join(END_TO_END_DIR, `out-${dirEnt.name}`), outputBuffer);

      console.log("output is emitted");

      const outputMovie: Movie = parseMovie(new ParserStream(outputBuffer));

      console.log("output is parsed");

      chai.assert.isTrue($Movie.equals(outputMovie, inputMovie));
    });
  }
});
