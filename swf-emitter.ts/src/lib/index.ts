import * as ast from "swf-tree";
import { CompressionMethod } from "swf-tree";
import { emitMovie } from "./emitters/movie";
import { Stream } from "./stream";

export { ast };

export function emitBytes(value: ast.Movie, compressionMethod: CompressionMethod = CompressionMethod.None): Uint8Array {
  const stream: Stream = new Stream();
  emitMovie(stream, value, compressionMethod);
  return stream.getBytes();
}
