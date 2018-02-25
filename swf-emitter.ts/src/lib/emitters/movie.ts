import { Incident } from "incident";
import { UintSize } from "semantic-types";
import { CompressionMethod, Movie, SwfSignature } from "swf-tree";
import * as zlib from "zlib";
import { ByteStream, Stream } from "../stream";
import { emitRect } from "./basic-data-types";
import { emitTagString } from "./tags";

export function emitCompressionMethod(byteStream: ByteStream, value: CompressionMethod): void {
  const COMPRESSION_TO_CHUNK: Map<CompressionMethod, Uint8Array> = new Map([
    [CompressionMethod.Deflate, new Uint8Array([0x43, 0x57, 0x53])],
    [CompressionMethod.Lzma, new Uint8Array([0x5a, 0x57, 0x53])],
    [CompressionMethod.None, new Uint8Array([0x46, 0x57, 0x53])],
  ]);

  const chunk: Uint8Array | undefined = COMPRESSION_TO_CHUNK.get(value);
  if (chunk === undefined) {
    throw new Incident("UnexpectedCompressionMethod");
  }
  byteStream.writeBytes(chunk);
}

const SIGNATURE_SIZE: UintSize = 8;

export function emitSwfSignature(byteStream: ByteStream, value: SwfSignature): void {
  emitCompressionMethod(byteStream, value.compressionMethod);
  byteStream.writeUint8(value.swfVersion);
  byteStream.writeUint32LE(value.uncompressedFileLength);
}

function emitMovieWithoutSignature(byteStream: ByteStream, value: Movie): void {
  emitRect(byteStream, value.header.frameSize);
  byteStream.writeUfixed8P8LE(value.header.frameRate);
  byteStream.writeUint16LE(value.header.frameCount);
  emitTagString(byteStream, value.tags, value.header.swfVersion);
}

export function emitMovie(byteStream: ByteStream, value: Movie, compressionMethod: CompressionMethod): void {
  const movieStream: Stream = new Stream();
  emitMovieWithoutSignature(movieStream, value);
  const uncompressedFileLength: UintSize = SIGNATURE_SIZE + movieStream.bytePos;
  const signature: SwfSignature = {
    compressionMethod,
    swfVersion: value.header.swfVersion,
    uncompressedFileLength,
  };
  emitSwfSignature(byteStream, signature);
  switch (compressionMethod) {
    case CompressionMethod.Deflate:
      const movieBytes: Uint8Array = movieStream.getBytes();
      byteStream.writeBytes(zlib.deflateSync(<any> movieBytes));
      break;
    case CompressionMethod.Lzma:
      throw new Incident("NotImplemented", "Lzma support");
    case CompressionMethod.None:
      byteStream.write(movieStream);
      break;
    default:
      throw new Incident("UnexpectedCompressionMethod");
  }
}
