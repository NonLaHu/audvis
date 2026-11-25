(function (global) {
  'use strict';

  /**
   * Minimal EBML WebM duration patcher.
   * MediaRecorder WebM files typically omit Segment > Info > Duration.
   * This locates the Segment Info element and either updates an existing
   * Duration float64 or appends one and adjusts parent VINT sizes when safe.
   */

  function readVint(bytes, offset, keepMarker) {
    if (offset >= bytes.length) return null;
    const first = bytes[offset];
    if (first === 0) return null;
    let length = 1;
    let mask = 0x80;
    while (length <= 8 && (first & mask) === 0) {
      mask >>= 1;
      length++;
    }
    if (length > 8 || offset + length > bytes.length) return null;

    let value = keepMarker ? first : first & ~mask;
    for (let i = 1; i < length; i++) {
      value = value * 256 + bytes[offset + i];
    }
    return { value, length };
  }

  function isUnknownSize(bytes, offset, length) {
    const firstMask = (0x80 >> (length - 1)) - 1;
    if ((bytes[offset] & firstMask) !== firstMask) return false;
    for (let i = 1; i < length; i++) {
      if (bytes[offset + i] !== 0xff) return false;
    }
    return true;
  }

  function encodeVint(value, length) {
    const out = new Uint8Array(length);
    let v = value;
    for (let i = length - 1; i >= 0; i--) {
      out[i] = v & 0xff;
      v = Math.floor(v / 256);
    }
    out[0] |= 0x80 >> (length - 1);
    return out;
  }

  function findElement(bytes, start, end, targetId) {
    let pos = start;
    while (pos < end) {
      const id = readVint(bytes, pos, true);
      if (!id) break;
      const size = readVint(bytes, pos + id.length, false);
      if (!size) break;
      const unknown = isUnknownSize(bytes, pos + id.length, size.length);
      const dataStart = pos + id.length + size.length;
      const dataEnd = unknown ? end : Math.min(end, dataStart + size.value);

      if (id.value === targetId) {
        return {
          idOffset: pos,
          sizeOffset: pos + id.length,
          sizeLength: size.length,
          dataStart,
          dataEnd,
          unknown,
          sizeValue: size.value
        };
      }
      if (unknown || dataEnd <= pos) break;
      pos = dataEnd;
    }
    return null;
  }

  async function fixWebmDuration(blob, durationMs) {
    if (!blob || !Number.isFinite(durationMs) || durationMs <= 0) {
      return blob;
    }
    try {
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      // Segment ID = 0x18538067
      const segment = findElement(bytes, 0, Math.min(bytes.length, 4096), 0x18538067);
      if (!segment) return blob;

      // Info ID = 0x1549A966
      const info = findElement(
        bytes,
        segment.dataStart,
        Math.min(segment.dataEnd, segment.dataStart + 65536),
        0x1549a966
      );
      if (!info) return blob;

      // TimecodeScale ID = 0x2AD7B1 (default 1,000,000 ns = 1 ms)
      let timecodeScale = 1000000;
      const tcEl = findElement(bytes, info.dataStart, info.dataEnd, 0x2ad7b1);
      if (tcEl) {
        let scale = 0;
        for (let i = tcEl.dataStart; i < tcEl.dataEnd; i++) {
          scale = scale * 256 + bytes[i];
        }
        if (scale > 0) timecodeScale = scale;
      }

      const durationUnits = (durationMs * 1000000) / timecodeScale;
      // Duration ID = 0x4489
      const durEl = findElement(bytes, info.dataStart, info.dataEnd, 0x4489);

      if (durEl && (durEl.dataEnd - durEl.dataStart === 8 || durEl.dataEnd - durEl.dataStart === 4)) {
        const out = new Uint8Array(bytes);
        const view = new DataView(out.buffer);
        if (durEl.dataEnd - durEl.dataStart === 8) {
          view.setFloat64(durEl.dataStart, durationUnits, false);
        } else {
          view.setFloat32(durEl.dataStart, durationUnits, false);
        }
        return new Blob([out], { type: blob.type || 'video/webm' });
      }

      // If Duration element is missing and Info has known size, insert 11 bytes:
      // 0x44 0x89 (2 bytes) + 0x88 (size=8, 1 byte) + float64 (8 bytes)
      if (!info.unknown && !durEl) {
        const insertBytes = new Uint8Array(11);
        insertBytes[0] = 0x44;
        insertBytes[1] = 0x89;
        insertBytes[2] = 0x88;
        new DataView(insertBytes.buffer).setFloat64(3, durationUnits, false);

        const newInfoSize = info.sizeValue + 11;
        const maxInfoForLen = Math.pow(2, 7 * info.sizeLength) - 2;
        if (newInfoSize > maxInfoForLen) return blob;

        const out = new Uint8Array(bytes.length + 11);
        out.set(bytes.subarray(0, info.dataEnd), 0);
        out.set(insertBytes, info.dataEnd);
        out.set(bytes.subarray(info.dataEnd), info.dataEnd + 11);

        const encodedInfoSize = encodeVint(newInfoSize, info.sizeLength);
        out.set(encodedInfoSize, info.sizeOffset);

        if (!segment.unknown) {
          const newSegSize = segment.sizeValue + 11;
          const maxSegForLen = Math.pow(2, 7 * segment.sizeLength) - 2;
          if (newSegSize <= maxSegForLen) {
            out.set(encodeVint(newSegSize, segment.sizeLength), segment.sizeOffset);
          }
        }
        return new Blob([out], { type: blob.type || 'video/webm' });
      }

      return blob;
    } catch (_err) {
      return blob;
    }
  }

  global.AudvisWebm = { fixWebmDuration };
})(window);
