import { WritableByteStream, WritableStream } from "@open-flash/stream";
import { Uint8 } from "semantic-types";
import * as ast from "swf-types";
import { CompressionMethod } from "swf-types";
import { emitSwf as emitSwfStream } from "./emitters/movie";
import { emitTag as emitTagStream } from "./emitters/tags";

export { ast };

/**
 * Emits an SWF movie as a byte array.
 *
 * @param value SWF movie to emit.
 * @param compressionMethod Compression method for the SWF payload.
 * @returns Corresponding byte array.
 */
export function emitSwf(
  value: ast.Movie,
  compressionMethod: CompressionMethod = CompressionMethod.None,
): Uint8Array {
  const stream: WritableByteStream = new WritableStream();
  emitSwfStream(stream, value, compressionMethod);
  return stream.getBytes();
}

/**
 * Emits an SWF tag as a byte array.
 *
 * @param value SWF tag to emit.
 * @param swfVersion SWF version to use for tags sensible to the version.
 * @returns Corresponding byte array.
 */
export function emitTag(
  value: ast.Tag,
  swfVersion: Uint8,
): Uint8Array {
  const stream: WritableByteStream = new WritableStream();
  emitTagStream(stream, value, swfVersion);
  return stream.getBytes();
}
