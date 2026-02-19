import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { addLogoToImage, getUploadPath } from "@/lib/sharp-logo";
import type { LogoConfig } from "@/lib/types";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imagePath = formData.get("imagePath") as string | null;
    const position = (formData.get("position") as LogoConfig["position"]) ?? "bottom-right";
    const sizePercent = Math.min(100, Math.max(5, Number(formData.get("sizePercent")) || 15));
    const opacity = Math.min(1, Math.max(0, Number(formData.get("opacity")) || 1));

    const imageFile = formData.get("image") as File | null;
    const logoFile = formData.get("logo") as File | null;

    if (!imageFile && !imagePath) {
      return NextResponse.json({ error: "Missing image or imagePath" }, { status: 400 });
    }
    if (!logoFile) {
      return NextResponse.json({ error: "Missing logo file" }, { status: 400 });
    }

    const logoBuffer = Buffer.from(await logoFile.arrayBuffer());
    const config: LogoConfig = {
      url: "",
      position,
      sizePercent,
      opacity,
    };

    let inputPath: string;
    if (imagePath && !imageFile) {
      inputPath = getUploadPath(path.basename(imagePath));
    } else if (imageFile) {
      await mkdir(UPLOADS_DIR, { recursive: true });
      const id = uuidv4();
      const ext = path.extname(imageFile.name) || ".jpg";
      const filename = `${id}${ext}`;
      inputPath = path.join(UPLOADS_DIR, filename);
      await writeFile(inputPath, Buffer.from(await imageFile.arrayBuffer()));
    } else {
      return NextResponse.json({ error: "No image source" }, { status: 400 });
    }

    const outputBuffer = await addLogoToImage(inputPath, logoBuffer, config);
    await mkdir(UPLOADS_DIR, { recursive: true });
    const outId = uuidv4();
    const outFilename = `with-logo-${outId}.jpg`;
    const outPath = path.join(UPLOADS_DIR, outFilename);
    await writeFile(outPath, outputBuffer);

    const url = `/uploads/${outFilename}`;
    return NextResponse.json({ url, path: outPath });
  } catch (e) {
    console.error("Add logo error:", e);
    return NextResponse.json({ error: "Add logo failed" }, { status: 500 });
  }
}
