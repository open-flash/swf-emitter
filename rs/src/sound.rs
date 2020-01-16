use swf_types as ast;

pub(crate) fn audio_coding_format_to_code(value: ast::AudioCodingFormat) -> u8 {
  match value {
    ast::AudioCodingFormat::UncompressedNativeEndian => 0,
    ast::AudioCodingFormat::Adpcm => 1,
    ast::AudioCodingFormat::Mp3 => 2,
    ast::AudioCodingFormat::UncompressedLittleEndian => 3,
    ast::AudioCodingFormat::Nellymoser16 => 4,
    ast::AudioCodingFormat::Nellymoser8 => 5,
    ast::AudioCodingFormat::Nellymoser => 6,
    ast::AudioCodingFormat::Speex => 11,
  }
}

pub(crate) fn sound_rate_to_code(value: ast::SoundRate) -> u8 {
  match value {
    ast::SoundRate::SoundRate5500 => 0,
    ast::SoundRate::SoundRate11000 => 1,
    ast::SoundRate::SoundRate22000 => 2,
    ast::SoundRate::SoundRate44000 => 3,
  }
}
