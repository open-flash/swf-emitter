use std::convert::TryInto;
use std::io;

use swf_tree as ast;
use crate::primitives::{emit_u8, emit_le_u32, emit_le_u16};
use crate::tags::emit_tag_string;
use crate::basic_data_types::emit_rect;

const SWF_SIGNATURE_SIZE: usize = 8;

pub fn emit_movie<W: io::Write>(
  writer: &mut W,
  value: &ast::Movie,
  compression_method: ast::CompressionMethod,
) -> io::Result<()> {
  let mut payload_writer = Vec::new();
  emit_payload(&mut payload_writer, value)?;
  let uncompressed_file_length = SWF_SIGNATURE_SIZE + payload_writer.len();
  let signature = ast::SwfSignature {
    compression_method,
    swf_version: value.header.swf_version,
    uncompressed_file_length
  };
  emit_swf_signature(writer, &signature)?;
  match compression_method {
    ast::CompressionMethod::Deflate => unimplemented!(),
    ast::CompressionMethod::Lzma => unimplemented!(),
    ast::CompressionMethod::None => writer.write_all(&payload_writer),
  }
}

pub fn emit_swf_signature<W: io::Write>(
  writer: &mut W,
  value: &ast::SwfSignature,
) -> io::Result<()> {
  assert!(value.uncompressed_file_length <= 0xffffffff);

  emit_compression_method(writer, value.compression_method)?;
  emit_u8(writer, value.swf_version)?;
  emit_le_u32(writer, value.uncompressed_file_length.try_into().unwrap())
}

pub fn emit_compression_method<W: io::Write>(
  writer: &mut W,
  value: ast::CompressionMethod,
) -> io::Result<()> {
  let code: &'static [u8] = match value {
    ast::CompressionMethod::Deflate => b"CWS",
    ast::CompressionMethod::Lzma => b"ZWS",
    ast::CompressionMethod::None => b"FWS",
  };
  writer.write_all(code)
}

pub fn emit_payload<W: io::Write>(
  writer: &mut W,
  value: &ast::Movie,
) -> io::Result<()> {
  emit_header(writer, &value.header)?;
  emit_tag_string(writer, &value.tags, value.header.swf_version)
}

pub fn emit_header<W: io::Write>(
  writer: &mut W,
  value: &ast::Header,
) -> io::Result<()> {
  emit_rect(writer, &value.frame_size)?;
  emit_le_u16(writer, value.frame_rate.epsilons)?;
  emit_le_u16(writer, value.frame_count)
}