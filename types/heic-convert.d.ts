declare module "heic-convert" {
  export interface HeicConvertOptions {
    buffer: Buffer;
    format: "JPEG" | "PNG";
    quality?: number;
  }

  /** Decodes the first HEIC image and encodes to JPEG or PNG. */
  function convert(opts: HeicConvertOptions): Promise<
    Buffer | Uint8Array | ArrayBuffer
  >;

  export default convert;
}
