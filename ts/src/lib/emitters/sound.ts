import { Incident } from "incident";
import { Uint2, Uint4 } from "semantic-types";
import { AudioCodingFormat } from "swf-types/sound/audio-coding-format";
import { SoundRate } from "swf-types/sound/sound-rate";

export function audioCodingFormatToCode(value: AudioCodingFormat): Uint4 {
  switch (value) {
    case AudioCodingFormat.UncompressedNativeEndian:
      return 0;
    case AudioCodingFormat.Adpcm:
      return 1;
    case AudioCodingFormat.Mp3:
      return 2;
    case AudioCodingFormat.UncompressedLittleEndian:
      return 3;
    case AudioCodingFormat.Nellymoser16:
      return 4;
    case AudioCodingFormat.Nellymoser8:
      return 5;
    case AudioCodingFormat.Nellymoser:
      return 6;
    case AudioCodingFormat.Speex:
      return 11;
    default:
      throw new Incident("UnexpectedAudioCodingFormat");
  }
}

export function soundRateToCode(value: SoundRate): Uint2 {
  switch (value) {
    case 5500:
      return 0;
    case 11000:
      return 1;
    case 22000:
      return 2;
    case 44000:
      return 3;
    default:
      throw new Incident("UnexpectedSoundRate");
  }
}
