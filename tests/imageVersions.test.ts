import { describe, it, expect } from 'vitest';
import { imageVersionToken } from '../src/data/dataStore';

describe('imageVersionToken', () => {
  it('encodes size and mtime as a stable "<size>-<mtime>" base36 token', () => {
    // 300331 -> 0x4952b -> "4952b" in base36? (base36 of 300331)
    expect(imageVersionToken(300331, 1_752_518_105_000)).toBe(
      `${(300331).toString(36)}-${(1_752_518_105_000).toString(36)}`,
    );
  });

  it('is deterministic for identical inputs', () => {
    expect(imageVersionToken(1234, 9_999_999)).toBe(imageVersionToken(1234, 9_999_999));
  });

  it('changes when the file size changes (content replaced, same mtime)', () => {
    expect(imageVersionToken(300331, 1_000)).not.toBe(imageVersionToken(294157, 1_000));
  });

  it('changes when the mtime changes (re-uploaded content, same size)', () => {
    expect(imageVersionToken(1000, 1_752_000_000_000)).not.toBe(
      imageVersionToken(1000, 1_752_000_009_999),
    );
  });

  it('floors fractional mtimes so the token stays integer-stable', () => {
    expect(imageVersionToken(1000, 1234.9)).toBe(imageVersionToken(1000, 1234));
  });
});
