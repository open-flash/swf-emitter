import { WritableByteStream, WritableStream } from "@open-flash/stream";
import * as ast from "swf-types";
import { CompressionMethod } from "swf-types";
import { emitMovie } from "./emitters/movie";

export { ast };

export function movieToBytes(
  value: ast.Movie,
  compressionMethod: CompressionMethod = CompressionMethod.None,
): Uint8Array {
  const stream: WritableByteStream = new WritableStream();
  emitMovie(stream, value, compressionMethod);
  return stream.getBytes();
}
