import { describe, it, expect } from 'vitest';
import { filterAboutImages } from '../src/data/dataStore';

describe('filterAboutImages', () => {
  it('keeps only Lebensweg image files and sorts them naturally', () => {
    const input = [
      'IMG_LEBENSWEG_10.png',
      'IMG_LEBENSWEG_02.png',
      'IMG_LEBENSWEG_01.png',
      'IMG_TITLE.jpeg',
      'strategoLogo.png',
      'README.md',
    ];
    expect(filterAboutImages(input)).toEqual([
      'IMG_LEBENSWEG_01.png',
      'IMG_LEBENSWEG_02.png',
      'IMG_LEBENSWEG_10.png',
    ]);
  });

  it('accepts different image extensions (case-insensitive)', () => {
    const input = ['img_lebensweg_04.JPEG', 'IMG_LEBENSWEG_03.webp'];
    expect(filterAboutImages(input)).toEqual([
      'IMG_LEBENSWEG_03.webp',
      'img_lebensweg_04.JPEG',
    ]);
  });

  it('returns an empty array when no matching files are present', () => {
    expect(filterAboutImages([])).toEqual([]);
    expect(filterAboutImages(['IMG_TITLE.jpeg', 'notes.txt'])).toEqual([]);
    // Non-image files with the prefix are ignored.
    expect(filterAboutImages(['IMG_LEBENSWEG_01.txt'])).toEqual([]);
  });
});
