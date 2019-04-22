use std::convert::TryInto;
use std::io;

use swf_tree as ast;

use crate::primitives::{emit_le_f16, emit_u8};

pub fn emit_font_alignment_zone<W: io::Write>(writer: &mut W, value: &ast::text::FontAlignmentZone) -> io::Result<()> {
  assert!(value.data.len() < 256);

  emit_u8(writer, value.data.len().try_into().unwrap())?;
  for zone_data in &value.data {
    emit_le_f16(writer, zone_data.origin)?;
    emit_le_f16(writer, zone_data.size)?;
  }
  let flags: u8 = 0
    | (if value.has_x { 1 << 0 } else { 0 })
    | (if value.has_y { 1 << 1 } else { 0 });
  // Skip bits [2, 7]
  emit_u8(writer, flags)
}
