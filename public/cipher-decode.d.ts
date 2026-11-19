declare const cipherDecode: {
  plan(value: string): Array<
    { text: string; glyphs?: undefined } |
    { text: string; glyphs: string[]; step: number; last: boolean }
  >;
};
export default cipherDecode;
