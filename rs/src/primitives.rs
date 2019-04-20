use std::io;

pub fn emit_u8<W: io::Write>(writer: &mut W, value: u8) -> io::Result<()> {
  writer.write_all(&[value])
}

pub fn emit_le_u16<W: io::Write>(writer: &mut W, value: u16) -> io::Result<()> {
  writer.write_all(&value.to_le_bytes())
}

pub fn emit_le_u32<W: io::Write>(writer: &mut W, value: u32) -> io::Result<()> {
  writer.write_all(&value.to_le_bytes())
}

pub fn emit_le_i16<W: io::Write>(writer: &mut W, value: i16) -> io::Result<()> {
  writer.write_all(&value.to_le_bytes())
}

pub fn emit_le_i32<W: io::Write>(writer: &mut W, value: i32) -> io::Result<()> {
  writer.write_all(&value.to_le_bytes())
}

pub fn emit_le_f32<W: io::Write>(writer: &mut W, value: f32) -> io::Result<()> {
  use byteorder::WriteBytesExt;
  writer.write_f32::<byteorder::LittleEndian>(value)
}
