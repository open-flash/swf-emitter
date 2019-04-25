use std::cmp::max;
use std::convert::TryInto;
use std::io;

use swf_fixed::Sfixed8P8;
use swf_tree as ast;

use crate::basic_data_types::{emit_c_string, emit_color_transform, emit_color_transform_with_alpha, emit_leb128_u32, emit_matrix, emit_rect, emit_s_rgb8, emit_straight_s_rgba8};
use crate::bit_count::{get_i32_bit_count, get_u32_bit_count};
use crate::button::{ButtonVersion, emit_button_record_string, emit_button2_cond_action_string};
use crate::display::{emit_blend_mode, emit_clip_actions_string, emit_filter_list};
use crate::morph_shape::{emit_morph_shape, MorphShapeVersion};
use crate::primitives::{emit_le_f32, emit_le_u16, emit_le_u32, emit_u8};
use crate::shape::{emit_shape, get_min_shape_version, ShapeVersion};
use crate::sound::{audio_coding_format_to_code, sound_rate_to_code};
use crate::text::{csm_table_hint_to_code, DefineFontVersion, DefineTextVersion, emit_font_alignment_zone, emit_font_layout, emit_language_code, emit_offset_glyphs, emit_text_record_string, grid_fitting_to_code, text_renderer_to_code};

pub fn emit_tag_string<W: io::Write>(writer: &mut W, value: &[ast::Tag], swf_version: u8) -> io::Result<()> {
  for tag in value {
    emit_tag(writer, tag, swf_version)?;
  }
  emit_end_of_tags(writer)
}

pub struct TagHeader {
  pub code: u16,
  pub length: u32,
}

fn emit_tag_header<W: io::Write>(writer: &mut W, value: TagHeader) -> io::Result<()> {
  use std::convert::TryFrom;

  const LENGTH_MASK: u16 = (1 << 6) - 1;

  if value.length < u32::from(LENGTH_MASK) && (value.length > 0 || (value.code & 0b11) != 0) {
    let code_and_length: u16 = (value.code << 6) | (u16::try_from(value.length).unwrap());
    emit_le_u16(writer, code_and_length)
  } else {
    let code_and_length: u16 = (value.code << 6) | LENGTH_MASK;
    emit_le_u16(writer, code_and_length)?;
    emit_le_u32(writer, value.length)
  }
}

pub fn emit_end_of_tags<W: io::Write>(writer: &mut W) -> io::Result<()> {
  emit_le_u16(writer, 0)
}

pub fn emit_tag<W: io::Write>(writer: &mut W, value: &ast::Tag, swf_version: u8) -> io::Result<()> {
  let mut tag_writer = Vec::new();

  let code: u16 = match value {
    ast::Tag::CsmTextSettings(ref tag) => {
      emit_csm_text_settings(&mut tag_writer, tag)?;
      74
    }
    ast::Tag::DefineBinaryData(ref _tag) => unimplemented!(),
    ast::Tag::DefineBitmap(ref tag) => {
      match emit_define_bitmap_any(&mut tag_writer, tag)? {
        DefineBitmapVersion::DefineBitsJpeg1 => 6,
        DefineBitmapVersion::DefineBitsLossless1 => 20,
        DefineBitmapVersion::DefineBitsJpeg2 => 21,
        DefineBitmapVersion::DefineBitsJpeg3 => 35,
        DefineBitmapVersion::DefineBitsLossless2 => 36,
        DefineBitmapVersion::DefineBitsJpeg4 => 90,
      }
    }
    ast::Tag::DefineButton(ref tag) => {
      match emit_define_button_any(&mut tag_writer, tag)? {
        ButtonVersion::Button1 => 7,
        ButtonVersion::Button2 => 34,
      }
    }
    ast::Tag::DefineCffFont(ref _tag) => unimplemented!(),
    ast::Tag::DefineDynamicText(ref _tag) => unimplemented!(),
    ast::Tag::DefineFont(ref tag) => {
      match emit_define_font_any(&mut tag_writer, tag)? {
        DefineFontVersion::Font1 => 10,
        DefineFontVersion::Font2 => 48,
        DefineFontVersion::Font3 => 75,
        DefineFontVersion::Font4 => 91,
      }
    }
    ast::Tag::DefineFontAlignZones(ref tag) => {
      emit_define_font_align_zones(&mut tag_writer, tag)?;
      73
    }
    ast::Tag::DefineFontInfo(ref _tag) => unimplemented!(),
    ast::Tag::DefineFontName(ref tag) => {
      emit_define_font_name(&mut tag_writer, tag)?;
      88
    }
    ast::Tag::DefineJpegTables(ref _tag) => unimplemented!(),
    ast::Tag::DefineMorphShape(ref tag) => {
      match emit_define_morph_shape_any(&mut tag_writer, tag)? {
        MorphShapeVersion::MorphShape1 => 46,
        MorphShapeVersion::MorphShape2 => 84,
      }
    }
    ast::Tag::DefinePartialFont(ref _tag) => unimplemented!(),
    ast::Tag::DefineSceneAndFrameLabelData(ref tag) => {
      emit_define_scene_and_frame_label_data(&mut tag_writer, tag)?;
      86
    }
    ast::Tag::DefineShape(ref tag) => {
      match emit_define_shape_any(&mut tag_writer, tag)? {
        ShapeVersion::Shape1 => 2,
        ShapeVersion::Shape2 => 22,
        ShapeVersion::Shape3 => 32,
        ShapeVersion::Shape4 => 83,
      }
    }
    ast::Tag::DefineSound(ref tag) => {
      emit_define_sound(&mut tag_writer, tag)?;
      14
    }
    ast::Tag::DefineSprite(ref tag) => {
      emit_define_sprite(&mut tag_writer, tag, swf_version)?;
      39
    }
    ast::Tag::DefineText(ref tag) => {
      match emit_define_text_any(&mut tag_writer, tag)? {
        DefineTextVersion::Text1 => 11,
        DefineTextVersion::Text2 => 33,
      }
    }
    ast::Tag::DoAbc(ref _tag) => unimplemented!(),
    ast::Tag::DoAction(ref tag) => {
      emit_do_action(&mut tag_writer, tag)?;
      12
    }
    ast::Tag::DoInitAction(ref _tag) => unimplemented!(),
    ast::Tag::EnableDebugger(ref _tag) => unimplemented!(),
    ast::Tag::ExportAssets(ref tag) => {
      emit_export_assets(&mut tag_writer, tag)?;
      56
    }
    ast::Tag::FileAttributes(ref tag) => {
      emit_file_attributes(&mut tag_writer, tag)?;
      69
    }
    ast::Tag::FrameLabel(ref tag) => {
      emit_frame_label(&mut tag_writer, tag)?;
      43
    }
    ast::Tag::ImportAssets(ref _tag) => unimplemented!(),
    ast::Tag::Metadata(ref tag) => {
      emit_metadata(&mut tag_writer, tag)?;
      77
    }
    ast::Tag::PlaceObject(ref tag) => {
      match emit_place_object_any(&mut tag_writer, tag, swf_version)? {
        PlaceObjectVersion::PlaceObject1 => 4,
        PlaceObjectVersion::PlaceObject2 => 26,
        PlaceObjectVersion::PlaceObject3 => 70,
      }
    }
    ast::Tag::RemoveObject(ref tag) => {
      match emit_remove_object_any(&mut tag_writer, tag)? {
        RemoveObjectVersion::RemoveObject1 => 5,
        RemoveObjectVersion::RemoveObject2 => 28,
      }
    }
    ast::Tag::ScriptLimits(ref _tag) => unimplemented!(),
    ast::Tag::SetBackgroundColor(ref tag) => {
      emit_set_background_color(&mut tag_writer, tag)?;
      9
    }
    ast::Tag::ShowFrame => {
      1
    }
    ast::Tag::SoundStreamBlock(ref _tag) => unimplemented!(),
    ast::Tag::SoundStreamHead(ref _tag) => unimplemented!(),
    ast::Tag::StartSound(ref _tag) => unimplemented!(),
    ast::Tag::StartSound2(ref _tag) => unimplemented!(),
    ast::Tag::SymbolClass(ref _tag) => unimplemented!(),
    ast::Tag::Telemetry(ref _tag) => unimplemented!(),
    ast::Tag::Unknown(ref _tag) => unimplemented!(),
  };

  emit_tag_header(writer, TagHeader { code, length: tag_writer.len().try_into().unwrap() })?;
  writer.write_all(&tag_writer)
}

pub fn emit_csm_text_settings<W: io::Write>(writer: &mut W, value: &ast::tags::CsmTextSettings) -> io::Result<()> {
  emit_le_u16(writer, value.text_id)?;

  let flags: u8 = 0
    // Skip bits [0, 2]
    | (grid_fitting_to_code(value.fitting) << 3)
    | (text_renderer_to_code(value.renderer) << 6);
  emit_u8(writer, flags)?;

  emit_le_f32(writer, value.thickness)?;
  emit_le_f32(writer, value.sharpness)?;
  emit_u8(writer, 0) // Reserved
}

#[derive(Copy, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum DefineBitmapVersion {
  DefineBitsJpeg1,
  DefineBitsJpeg2,
  DefineBitsJpeg3,
  DefineBitsJpeg4,
  DefineBitsLossless1,
  DefineBitsLossless2,
}

pub fn emit_define_bitmap_any<W: io::Write>(writer: &mut W, value: &ast::tags::DefineBitmap) -> io::Result<DefineBitmapVersion> {
  emit_le_u16(writer, value.id)?;
  writer.write_all(&value.data)?;

  let version = match value.media_type {
    ast::ImageType::SwfBmp => DefineBitmapVersion::DefineBitsLossless1,
    ast::ImageType::SwfAbmp => DefineBitmapVersion::DefineBitsLossless2,
    ast::ImageType::Jpeg | ast::ImageType::Gif | ast::ImageType::Png => DefineBitmapVersion::DefineBitsJpeg2,
    ast::ImageType::Ajpeg => DefineBitmapVersion::DefineBitsJpeg3,
    ast::ImageType::PartialJpeg => DefineBitmapVersion::DefineBitsJpeg1,
  };

  Ok(version)
}

pub(crate) fn emit_define_button_any<W: io::Write>(writer: &mut W, value: &ast::tags::DefineButton) -> io::Result<ButtonVersion> {
  emit_le_u16(writer, value.id)?;

  let flags: u8 = 0
    | (if value.track_as_menu { 1 << 0 } else { 0 });
  emit_u8(writer, flags)?;

  // TODO: Select the lowest compatible `ButtonVersion`
  let version: ButtonVersion = ButtonVersion::Button2;

  let mut record_writer: Vec<u8> = Vec::new();
  emit_button_record_string(&mut record_writer, &value.characters, version)?;
  if value.actions.len() == 0 {
    emit_le_u16(writer, 0)?;
    writer.write_all(&record_writer)?;
  } else {
    // Add the size of the offset field itself
    let action_offset = record_writer.len() + std::mem::size_of::<u16>();
    emit_le_u16(writer, action_offset.try_into().unwrap())?;
    writer.write_all(&record_writer)?;
    emit_button2_cond_action_string(writer, &value.actions)?;
  }
  Ok(version)
}

pub(crate) fn emit_define_font_any<W: io::Write>(writer: &mut W, value: &ast::tags::DefineFont) -> io::Result<DefineFontVersion> {
  emit_le_u16(writer, value.id)?;

  let use_wide_codes = true; // `false` is deprecated since SWF6
  let mut offset_glyph_writer = Vec::new();
  let use_wide_offsets = if let Some(ref glyphs) = &value.glyphs {
    emit_offset_glyphs(&mut offset_glyph_writer, glyphs)?
  } else {
    false
  };
  let has_layout = value.layout.is_some();

  let flags: u8 = 0
    | (if value.is_bold { 1 << 0 } else { 0 })
    | (if value.is_italic { 1 << 1 } else { 0 })
    | (if use_wide_codes { 1 << 2 } else { 0 })
    | (if use_wide_offsets { 1 << 3 } else { 0 })
    | (if value.is_ansi { 1 << 4 } else { 0 })
    | (if value.is_small { 1 << 5 } else { 0 })
    | (if value.is_shift_jis { 1 << 6 } else { 0 })
    | (if has_layout { 1 << 7 } else { 0 });
  emit_u8(writer, flags)?;

  emit_language_code(writer, value.language)?;

  let font_name_c_string = std::ffi::CString::new(value.font_name.clone()).unwrap();
  let font_name_bytes = font_name_c_string.as_bytes_with_nul();
  emit_u8(writer, font_name_bytes.len().try_into().unwrap())?;
  writer.write_all(font_name_bytes)?;

  if let Some(ref glyphs) = &value.glyphs {
    emit_le_u16(writer, glyphs.len().try_into().unwrap())?;
    writer.write_all(&offset_glyph_writer)?;
    // TODO: Assert codeUnits is defined (should be defined because of .glyphs)
    for code_unit in value.code_units.as_ref().unwrap() {
      debug_assert!(use_wide_codes);
      emit_le_u16(writer, *code_unit)?;
    }

    if let Some(ref layout) = &value.layout {
      emit_font_layout(writer, layout)?;
    }
  } else {
    // According to Shumway:
    // > The SWF format docs doesn't say that, but the DefineFont{2,3} tag ends
    // > here for device fonts.
    emit_le_u16(writer, 0)?;
  }

  Ok(DefineFontVersion::Font3)
}

pub fn emit_define_font_align_zones<W: io::Write>(writer: &mut W, value: &ast::tags::DefineFontAlignZones) -> io::Result<()> {
  emit_le_u16(writer, value.font_id)?;
  let flags: u8 = 0
    // Skip bits [0, 5]
    | (csm_table_hint_to_code(value.csm_table_hint) << 6);
  emit_u8(writer, flags)?;
  for zone in &value.zones {
    emit_font_alignment_zone(writer, zone)?;
  }
  Ok(())
}

pub fn emit_define_font_name<W: io::Write>(writer: &mut W, value: &ast::tags::DefineFontName) -> io::Result<()> {
  emit_le_u16(writer, value.font_id)?;
  emit_c_string(writer, &value.name)?;
  emit_c_string(writer, &value.copyright)
}

pub fn emit_define_morph_shape_any<W: io::Write>(writer: &mut W, value: &ast::tags::DefineMorphShape) -> io::Result<MorphShapeVersion> {
  emit_le_u16(writer, value.id)?;
  emit_rect(writer, &value.bounds)?;
  emit_rect(writer, &value.morph_bounds)?;

  let version = if let Some(ref edge_bounds) = &value.edge_bounds {
    let morph_edge_bounds = &value.morph_edge_bounds.unwrap();
    emit_rect(writer, &edge_bounds)?;
    emit_rect(writer, &morph_edge_bounds)?;
    let flags: u8 = 0
      | (if value.has_scaling_strokes { 1 << 0 } else { 0 })
      | (if value.has_non_scaling_strokes { 1 << 1 } else { 0 });
    // Skip bits [2, 7]
    emit_u8(writer, flags)?;
    MorphShapeVersion::MorphShape2
  } else {
    MorphShapeVersion::MorphShape1
  };
  emit_morph_shape(writer, &value.shape, version)?;
  Ok(version)
}

pub fn emit_define_scene_and_frame_label_data<W: io::Write>(writer: &mut W, value: &ast::tags::DefineSceneAndFrameLabelData) -> io::Result<()> {
  emit_leb128_u32(writer, value.scenes.len().try_into().unwrap())?;
  for scene in &value.scenes {
    emit_leb128_u32(writer, scene.offset)?;
    emit_c_string(writer, &scene.name)?;
  }
  emit_leb128_u32(writer, value.labels.len().try_into().unwrap())?;
  for label in &value.labels {
    emit_leb128_u32(writer, label.frame)?;
    emit_c_string(writer, &label.name)?;
  }
  Ok(())
}

pub fn emit_define_shape_any<W: io::Write>(writer: &mut W, value: &ast::tags::DefineShape) -> io::Result<ShapeVersion> {
  emit_le_u16(writer, value.id)?;
  emit_rect(writer, &value.bounds)?;
  let version = if let Some(ref edge_bounds) = &value.edge_bounds {
    emit_rect(writer, &edge_bounds)?;
    let flags: u8 = 0
      | (if value.has_scaling_strokes { 1 << 0 } else { 0 })
      | (if value.has_non_scaling_strokes { 1 << 1 } else { 0 })
      | (if value.has_fill_winding { 1 << 2 } else { 0 });
    // Skip bits [3, 7]
    emit_u8(writer, flags)?;
    ShapeVersion::Shape4
  } else {
    get_min_shape_version(&value.shape)
  };
  emit_shape(writer, &value.shape, version)?;
  Ok(version)
}

pub fn emit_define_sound<W: io::Write>(writer: &mut W, value: &ast::tags::DefineSound) -> io::Result<()> {
  emit_le_u16(writer, value.id)?;

  let flags: u8 = 0
    | (if value.sound_type == ast::SoundType::Stereo { 1 << 0 } else { 0 })
    | (if value.sound_size == ast::SoundSize::SoundSize16 { 1 << 1 } else { 0 })
    | (sound_rate_to_code(value.sound_rate) << 2)
    | (audio_coding_format_to_code(value.format) << 4);
  emit_u8(writer, flags)?;

  emit_le_u32(writer, value.sample_count)?;
  writer.write_all(&value.data)
}

pub fn emit_define_sprite<W: io::Write>(writer: &mut W, value: &ast::tags::DefineSprite, swf_version: u8) -> io::Result<()> {
  emit_le_u16(writer, value.id)?;
  emit_le_u16(writer, value.frame_count.try_into().unwrap())?;
  emit_tag_string(writer, &value.tags, swf_version)
}

pub(crate) fn emit_define_text_any<W: io::Write>(writer: &mut W, value: &ast::tags::DefineText) -> io::Result<DefineTextVersion> {
  emit_le_u16(writer, value.id)?;
  emit_rect(writer, &value.bounds)?;
  emit_matrix(writer, &value.matrix)?;
  let mut index_bits: u32 = 0;
  let mut advance_bits: u32 = 0;
  let mut has_alpha = false;
  for record in &value.records {
    if let Some(color) = record.color {
      if color.a != u8::max_value() {
        has_alpha = true;
      }
    }
    for entry in &record.entries {
      index_bits = max(index_bits, get_u32_bit_count(entry.index.try_into().unwrap()));
      advance_bits = max(advance_bits, get_i32_bit_count(entry.advance.try_into().unwrap()));
    }
  }
  emit_u8(writer, index_bits.try_into().unwrap())?;
  emit_u8(writer, advance_bits.try_into().unwrap())?;
  emit_text_record_string(writer, &value.records, index_bits, advance_bits, has_alpha)?;

  Ok(if has_alpha { DefineTextVersion::Text2 } else { DefineTextVersion::Text1 })
}

pub fn emit_do_action<W: io::Write>(writer: &mut W, value: &ast::tags::DoAction) -> io::Result<()> {
  writer.write_all(&value.actions)
}

pub fn emit_export_assets<W: io::Write>(writer: &mut W, value: &ast::tags::ExportAssets) -> io::Result<()> {
  emit_le_u16(writer, value.assets.len().try_into().unwrap())?;
  for asset in &value.assets {
    emit_le_u16(writer, asset.id)?;
    emit_c_string(writer, &asset.name)?;
  }
  Ok(())
}

pub fn emit_file_attributes<W: io::Write>(writer: &mut W, value: &ast::tags::FileAttributes) -> io::Result<()> {
  let flags: u32 = 0
    | (if value.use_network { 1 << 0 } else { 0 })
    | (if value.use_relative_urls { 1 << 1 } else { 0 })
    | (if value.no_cross_domain_caching { 1 << 2 } else { 0 })
    | (if value.use_as3 { 1 << 3 } else { 0 })
    | (if value.has_metadata { 1 << 4 } else { 0 })
    | (if value.use_gpu { 1 << 5 } else { 0 })
    | (if value.use_direct_blit { 1 << 6 } else { 0 });
  // Skip bits [7, 31]

  emit_le_u32(writer, flags)
}

pub fn emit_frame_label<W: io::Write>(writer: &mut W, value: &ast::tags::FrameLabel) -> io::Result<()> {
  emit_c_string(writer, &value.name)?;
  if value.is_anchor {
    emit_u8(writer, 1)?;
  }
  Ok(())
}

pub fn emit_metadata<W: io::Write>(writer: &mut W, value: &ast::tags::Metadata) -> io::Result<()> {
  emit_c_string(writer, &value.metadata)
}

pub enum PlaceObjectVersion {
  PlaceObject1,
  PlaceObject2,
  PlaceObject3,
}

pub fn emit_place_object_any<W: io::Write>(writer: &mut W, value: &ast::tags::PlaceObject, swf_version: u8) -> io::Result<PlaceObjectVersion> {
  const FIXED_ONE: Sfixed8P8 = Sfixed8P8::from_epsilons(256);

  let is_update = value.is_update;
  let has_character_id = value.character_id.is_some();
  let has_matrix = value.matrix.is_some();
  let has_color_transform = value.color_transform.is_some();
  let has_color_transform_with_alpha = value.color_transform
    .map(|cx| cx.alpha_mult != FIXED_ONE || cx.alpha_add != 0)
    .unwrap_or(false);
  let has_ratio = value.ratio.is_some();
  let has_name = value.name.is_some();
  let has_clip_depth = value.clip_depth.is_some();
  let has_clip_actions = value.clip_actions.is_some();
  let has_filters = value.filters.is_some();
  let has_blend_mode = value.blend_mode.is_some();
  let has_cache_hint = value.bitmap_cache.is_some();
  let has_class_name = value.class_name.is_some();
  let has_image = false; // TODO: We need more context to handle images
  let has_visibility = value.visible.is_some();
  let has_background_color = value.background_color.is_some();

  if has_filters || has_blend_mode || has_cache_hint || has_class_name || has_image || has_visibility || has_background_color {
    let flags: u16 = 0
      | (if is_update { 1 << 0 } else { 0 })
      | (if has_character_id { 1 << 1 } else { 0 })
      | (if has_matrix { 1 << 2 } else { 0 })
      | (if has_color_transform { 1 << 3 } else { 0 })
      | (if has_ratio { 1 << 4 } else { 0 })
      | (if has_name { 1 << 5 } else { 0 })
      | (if has_clip_depth { 1 << 6 } else { 0 })
      | (if has_clip_actions { 1 << 7 } else { 0 })
      | (if has_filters { 1 << 8 } else { 0 })
      | (if has_blend_mode { 1 << 9 } else { 0 })
      | (if has_cache_hint { 1 << 10 } else { 0 })
      | (if has_class_name { 1 << 11 } else { 0 })
      | (if has_image { 1 << 12 } else { 0 })
      | (if has_visibility { 1 << 13 } else { 0 })
      | (if has_background_color { 1 << 14 } else { 0 });
    emit_le_u16(writer, flags)?;
    emit_le_u16(writer, value.depth)?;
    if let Some(ref class_name) = &value.class_name {
      emit_c_string(writer, class_name)?;
    }
    if let Some(character_id) = value.character_id {
      emit_le_u16(writer, character_id)?;
    }
    if let Some(ref matrix) = &value.matrix {
      emit_matrix(writer, matrix)?;
    }
    if let Some(ref color_transform) = &value.color_transform {
      emit_color_transform_with_alpha(writer, color_transform)?;
    }
    if let Some(ratio) = value.ratio {
      emit_le_u16(writer, ratio)?;
    }
    if let Some(ref name) = &value.name {
      emit_c_string(writer, name)?;
    }
    if let Some(clip_depth) = value.clip_depth {
      emit_le_u16(writer, clip_depth)?;
    }
    if let Some(ref filters) = &value.filters {
      emit_filter_list(writer, filters)?;
    }
    if let Some(blend_mode) = value.blend_mode {
      emit_blend_mode(writer, blend_mode)?;
    }
    if let Some(bitmap_cache) = value.bitmap_cache {
      emit_u8(writer, if bitmap_cache { 1 } else { 0 })?;
    }
    if let Some(visible) = value.visible {
      emit_u8(writer, if visible { 1 } else { 0 })?;
    }
    if let Some(background_color) = value.background_color {
      emit_straight_s_rgba8(writer, background_color)?;
    }
    if let Some(ref clip_actions) = &value.clip_actions {
      emit_clip_actions_string(writer, clip_actions, swf_version >= 6)?;
    }
    Ok(PlaceObjectVersion::PlaceObject3)
  } else if !has_character_id || !has_matrix || is_update || has_color_transform_with_alpha || has_ratio || has_name || has_clip_depth || has_clip_actions {
    let flags: u8 = 0
      | (if is_update { 1 << 0 } else { 0 })
      | (if has_character_id { 1 << 1 } else { 0 })
      | (if has_matrix { 1 << 2 } else { 0 })
      | (if has_color_transform { 1 << 3 } else { 0 })
      | (if has_ratio { 1 << 4 } else { 0 })
      | (if has_name { 1 << 5 } else { 0 })
      | (if has_clip_depth { 1 << 6 } else { 0 })
      | (if has_clip_actions { 1 << 7 } else { 0 });
    emit_u8(writer, flags)?;
    emit_le_u16(writer, value.depth)?;
    if let Some(character_id) = value.character_id {
      emit_le_u16(writer, character_id)?;
    }
    if let Some(ref matrix) = &value.matrix {
      emit_matrix(writer, matrix)?;
    }
    if let Some(ref color_transform) = &value.color_transform {
      emit_color_transform_with_alpha(writer, color_transform)?;
    }
    if let Some(ratio) = value.ratio {
      emit_le_u16(writer, ratio)?;
    }
    if let Some(ref name) = &value.name {
      emit_c_string(writer, name)?;
    }
    if let Some(clip_depth) = value.clip_depth {
      emit_le_u16(writer, clip_depth)?;
    }
    if let Some(ref clip_actions) = &value.clip_actions {
      emit_clip_actions_string(writer, clip_actions, swf_version >= 6)?;
    }
    Ok(PlaceObjectVersion::PlaceObject2)
  } else {
    debug_assert!(has_character_id && has_matrix && !has_color_transform_with_alpha);
    emit_le_u16(writer, value.character_id.unwrap())?;
    emit_le_u16(writer, value.depth)?;
    emit_matrix(writer, &value.matrix.unwrap())?;
    if let Some(ref color_transform_with_alpha) = &value.color_transform {
      let color_transform = ast::ColorTransform {
        red_mult: color_transform_with_alpha.red_mult,
        green_mult: color_transform_with_alpha.green_mult,
        blue_mult: color_transform_with_alpha.blue_mult,
        red_add: color_transform_with_alpha.red_add,
        green_add: color_transform_with_alpha.green_add,
        blue_add: color_transform_with_alpha.blue_add,
      };
      emit_color_transform(writer, &color_transform)?;
    }
    Ok(PlaceObjectVersion::PlaceObject1)
  }
}

pub enum RemoveObjectVersion {
  RemoveObject1,
  RemoveObject2,
}

pub fn emit_remove_object_any<W: io::Write>(writer: &mut W, value: &ast::tags::RemoveObject) -> io::Result<RemoveObjectVersion> {
  if let Some(character_id) = value.character_id {
    emit_le_u16(writer, character_id)?;
    emit_le_u16(writer, value.depth)?;
    Ok(RemoveObjectVersion::RemoveObject1)
  } else {
    emit_le_u16(writer, value.depth)?;
    Ok(RemoveObjectVersion::RemoveObject2)
  }
}

pub fn emit_set_background_color<W: io::Write>(writer: &mut W, value: &ast::tags::SetBackgroundColor) -> io::Result<()> {
  emit_s_rgb8(writer, value.color)
}
