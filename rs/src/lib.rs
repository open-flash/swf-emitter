extern crate swf_fixed;
extern crate swf_tree;

pub mod bit_count;
pub mod display;
pub mod io_bits;
pub mod basic_data_types;
pub mod primitives;
pub mod tags;

#[cfg(test)]
mod lib_tests {
  use std::path::Path;

  use swf_tree::Tag;

  use ::test_generator::test_expand_paths;

  use crate::tags::emit_tag;

  test_expand_paths! { test_emit_tag; "../tests/tags/*/*/" }
  fn test_emit_tag(path: &str) {
    let path: &Path = Path::new(path);
    let _name = path.components().last().unwrap().as_os_str().to_str().expect("Failed to retrieve sample name");

    if _name == "hello-world-zones" {
      return;
    }

    let value_path = path.join("value.json");
    let value_file = ::std::fs::File::open(value_path).expect("Failed to open value file");
    let value_reader = ::std::io::BufReader::new(value_file);
    let value = serde_json::from_reader::<_, Tag>(value_reader).expect("Failed to read value");

    let mut actual_bytes = Vec::new();
    emit_tag(&mut actual_bytes, &value, 10).unwrap();

    let expected_path = path.join("output.bytes");
    let expected_bytes: Vec<u8> = ::std::fs::read(expected_path).expect("Failed to read expected output");

    assert_eq!(expected_bytes, actual_bytes);
  }

  macro_rules! test_various_ref_emitter_impl {
    ($name:ident, $glob:expr, $emitter:ident, $type:ty) => {
      test_expand_paths! { $name; $glob }
      fn $name(path: &str) {
        let path: &Path = Path::new(path);
        let _name = path.components().last().unwrap().as_os_str().to_str().expect("Failed to retrieve sample name");

        let value_path = path.join("value.json");
        let value_file = ::std::fs::File::open(value_path).expect("Failed to open value file");
        let value_reader = ::std::io::BufReader::new(value_file);
        let value = serde_json::from_reader::<_, $type>(value_reader).expect("Failed to read value");

        let mut actual_bytes = Vec::new();
        $emitter(&mut actual_bytes, &value).expect("Failed to emit");

        let expected_bytes: Vec<u8> = {
          match ::std::fs::read(path.join("output.bytes")) {
            Err(ref e) if e.kind() == std::io::ErrorKind::NotFound => {
              ::std::fs::read(path.join("input.bytes")).expect("Failed to read expected output (input.bytes)")
            },
            r => r.expect("Failed to read expected output (output.bytes)")
          }
        };

        assert_eq!(expected_bytes, actual_bytes);
      }
    }
  }

  // TODO: Avoid duplication with `test_various_ref_emitter_impl`. The only difference is that the value is passed by
  //       copy instead of reference.
  macro_rules! test_various_copy_emitter_impl {
    ($name:ident, $glob:expr, $emitter:ident, $type:ty) => {
      test_expand_paths! { $name; $glob }
      fn $name(path: &str) {
        let path: &Path = Path::new(path);
        let _name = path.components().last().unwrap().as_os_str().to_str().expect("Failed to retrieve sample name");

        let value_path = path.join("value.json");
        let value_file = ::std::fs::File::open(value_path).expect("Failed to open value file");
        let value_reader = ::std::io::BufReader::new(value_file);
        let value = serde_json::from_reader::<_, $type>(value_reader).expect("Failed to read value");

        let mut actual_bytes = Vec::new();
        $emitter(&mut actual_bytes, value).expect("Failed to emit");

        let expected_bytes: Vec<u8> = {
          match ::std::fs::read(path.join("output.bytes")) {
            Err(ref e) if e.kind() == std::io::ErrorKind::NotFound => {
              ::std::fs::read(path.join("input.bytes")).expect("Failed to read expected output (input.bytes)")
            },
            r => r.expect("Failed to read expected output (output.bytes)")
          }
        };

        assert_eq!(expected_bytes, actual_bytes);
      }
    }
  }

  use crate::basic_data_types::emit_matrix;
  use swf_tree::Matrix;
  test_various_ref_emitter_impl!(test_emit_matrix, "../tests/various/matrix/*/", emit_matrix, Matrix);

  use crate::basic_data_types::emit_rect;
  use swf_tree::Rect;
  test_various_ref_emitter_impl!(test_emit_rect, "../tests/various/rect/*/", emit_rect, Rect);

  use crate::basic_data_types::emit_leb128_u32;
  test_various_copy_emitter_impl!(test_emit_leb128_u32, "../tests/various/uint32-leb128/*/", emit_leb128_u32, u32);
}
