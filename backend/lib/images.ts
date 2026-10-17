import "server-only";
import sharp from "sharp";
import { ApiError } from "@/lib/http";

type ImageKind = "jpeg" | "png" | "webp";

/** Identifies the real file type from its first bytes. File names and Content-Type are not trusted. */
export function sniffImageType(buf: Buffer): ImageKind | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

/**
 * Re-encodes an uploaded photo: honors the camera orientation, then drops ALL metadata
 * (EXIF, GPS location, camera serials), caps it at 1600px and saves WebP.
 */
export async function processListingPhoto(input: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  if (!sniffImageType(input)) {
    throw new ApiError(400, "invalid_image", "Upload a JPEG, PNG or WebP photo.");
  }
  try {
    // sharp writes no metadata unless .withMetadata()/.keepExif() is called.
    const { data, info } = await sharp(input, { limitInputPixels: 50_000_000, failOn: "error" })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch {
    throw new ApiError(400, "invalid_image", "That photo couldn't be read. Try a different one.");
  }
}
