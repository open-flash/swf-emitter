import chai from "chai";
import fs from "fs";
import sysPath from "path";
import { movieFromBytes } from "swf-parser";
import { CompressionMethod } from "swf-tree";
import { $Movie, Movie } from "swf-tree/movie";
import { movieToBytes } from "../lib";
import meta from "./meta.js";

export const END_TO_END_DIR: string = sysPath.join(meta.dirname, "end-to-end");

describe("End-to-end", function () {
  for (const dirEnt of fs.readdirSync(END_TO_END_DIR, {withFileTypes: true})) {
    if (!dirEnt.isFile() || !/\.swf$/.test(dirEnt.name)) {
      continue;
    }
    it(dirEnt.name, function (this: Mocha.Context) {
      this.timeout(30 * 1000);

      const filePath: string = sysPath.join(END_TO_END_DIR, dirEnt.name);
      const inputBytes: Uint8Array = fs.readFileSync(filePath);

      // console.log("start");

      const inputMovie: Movie = movieFromBytes(inputBytes);

      // console.log("input is parsed");

      const outputBytes: Uint8Array = movieToBytes(inputMovie, CompressionMethod.None);

      fs.writeFileSync(sysPath.join(END_TO_END_DIR, `out-${dirEnt.name}`), outputBytes);

      // console.log("output is emitted");

      const outputMovie: Movie = movieFromBytes(outputBytes);

      // console.log("output is parsed");

      chai.assert.isTrue($Movie.equals(outputMovie, inputMovie));
    });
  }
});
