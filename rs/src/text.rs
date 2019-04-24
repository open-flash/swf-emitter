use std::convert::TryInto;
use std::io;

use swf_tree as ast;

use crate::basic_data_types::emit_rect;
use crate::primitives::{emit_le_f16, emit_le_i16, emit_le_u16, emit_le_u32, emit_u8};
use crate::shape::emit_glyph;

// TODO: Remove unused variants (`dead_code` should not be allowed)
#[allow(dead_code)]
#[derive(Copy, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub(crate) enum DefineFontVersion {
  Font1,
  Font2,
  Font3,
  Font4,
}

pub(crate) fn csm_table_hint_to_code(value: ast::text::CsmTableHint) -> u8 {
  match value {
    ast::text::CsmTableHint::Thin => 0,
    ast::text::CsmTableHint::Medium => 1,
    ast::text::CsmTableHint::Thick => 2,
  }
}

pub(crate) fn emit_language_code<W: io::Write>(writer: &mut W, value: ast::LanguageCode) -> io::Result<()> {
  let code: u8 = match value {
    ast::LanguageCode::Auto => 0,
    ast::LanguageCode::Latin => 1,
    ast::LanguageCode::Japanese => 2,
    ast::LanguageCode::Korean => 3,
    ast::LanguageCode::SimplifiedChinese => 4,
    ast::LanguageCode::TraditionalChinese => 5,
  };
  emit_u8(writer, code)
}

pub(crate) fn emit_font_alignment_zone<W: io::Write>(writer: &mut W, value: &ast::text::FontAlignmentZone) -> io::Result<()> {
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

pub(crate) fn emit_offset_glyphs<W: io::Write>(writer: &mut W, value: &[ast::Glyph]) -> io::Result<bool> {
  let mut end_offsets: Vec<usize> = Vec::with_capacity(value.len());
  let mut glyph_writer: Vec<u8> = Vec::new();
  for glyph in value {
    emit_glyph(&mut glyph_writer, glyph)?;
    end_offsets.push(glyph_writer.len());
  }

  let offset_table_len = end_offsets.len() + 1;
  let short_offset_table_size = offset_table_len * std::mem::size_of::<u16>();
  let max_offset_with_short_table = short_offset_table_size + glyph_writer.len();

  let use_wide_offsets = max_offset_with_short_table > usize::from(u16::max_value());

  if use_wide_offsets {
    let wide_offset_table_size = offset_table_len * std::mem::size_of::<u32>();

    emit_le_u32(writer, wide_offset_table_size.try_into().unwrap())?;
    for end_offset in end_offsets {
      emit_le_u32(writer, (wide_offset_table_size + end_offset).try_into().unwrap())?;
    }
  } else {
    emit_le_u16(writer, short_offset_table_size.try_into().unwrap())?;
    for end_offset in end_offsets {
      emit_le_u16(writer, (short_offset_table_size + end_offset).try_into().unwrap())?;
    }
  }

  writer.write_all(&glyph_writer)?;

  Ok(use_wide_offsets)
}

pub(crate) fn emit_font_layout<W: io::Write>(writer: &mut W, value: &ast::text::FontLayout) -> io::Result<()> {
  emit_le_u16(writer, value.ascent)?;
  emit_le_u16(writer, value.descent)?;
  emit_le_u16(writer, value.leading)?;
  for advance in &value.advances {
    emit_le_u16(writer, *advance)?;
  }
  for bound in &value.bounds {
    emit_rect(writer, bound)?;
  }
  emit_le_u16(writer, value.kerning.len().try_into().unwrap())?;
  for kerning_record in &value.kerning {
    emit_kerning_record(writer, kerning_record)?;
  }
  Ok(())
}

pub(crate) fn emit_kerning_record<W: io::Write>(writer: &mut W, value: &ast::text::KerningRecord) -> io::Result<()> {
  emit_le_u16(writer, value.left)?;
  emit_le_u16(writer, value.right)?;
  emit_le_i16(writer, value.adjustment)
}
