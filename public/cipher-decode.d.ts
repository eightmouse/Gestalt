declare const cipherDecode: {
  plan(value: string): { initial: string; burst: string; steps: number } | null;
};
export default cipherDecode;
