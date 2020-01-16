import * as fs from "fs";
import { JsonReader } from "kryo/readers/json";
import * as sysPath from "path";
import { CompressionMethod, Movie } from "swf-types";
import { $Movie } from "swf-types/movie";
import { movieToBytes } from "../lib";

async function main(): Promise<void> {
  if (process.argv.length < 3) {
    console.error("Missing input path");
    return;
  }
  const filePath: string = process.argv[2];
  const absFilePath: string = sysPath.resolve(filePath);
  const raw: string = fs.readFileSync(absFilePath, {encoding: "UTF-8"});
  const movie: Movie = $Movie.read(new JsonReader(), raw);
  const movieBytes: Uint8Array = movieToBytes(movie, CompressionMethod.None);
  fs.writeFileSync("movie.swf", movieBytes, {encoding: null});
}

main()
  .catch((err: Error): never => {
    console.error(err.stack);
    process.exit(1);
    return undefined as never;
  });
