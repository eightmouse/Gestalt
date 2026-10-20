export function verifiedMediaExtension(type: string, bytes: Uint8Array): string | null {
  const matches = (offset: number, signature: number[]) =>
    signature.every((value, index) => bytes[offset + index] === value);

  switch (type) {
    case "image/png":
      return matches(0, [137, 80, 78, 71, 13, 10, 26, 10]) ? "png" : null;
    case "image/jpeg":
      return matches(0, [255, 216, 255]) ? "jpg" : null;
    case "image/webp":
      return matches(0, [82, 73, 70, 70]) && matches(8, [87, 69, 66, 80]) ? "webp" : null;
    case "image/gif":
      return matches(0, [71, 73, 70, 56]) && [55, 57].includes(bytes[4]) && bytes[5] === 97 ? "gif" : null;
    case "video/mp4":
      return bytes.length >= 12 && matches(4, [102, 116, 121, 112]) ? "mp4" : null;
    case "video/webm":
      return matches(0, [26, 69, 223, 163]) ? "webm" : null;
    default:
      return null;
  }
}
