#!/usr/bin/env -S deno run --allow-read --allow-env --allow-run

import $ from "https://deno.land/x/dax@0.39.2/mod.ts";

const SOURCE_FILE = "source.jpg";
const EXIFTOOL = ["exiftool", "-q", "-overwrite_original_in_place"];

async function isPhotoDirectory(dir: string): Promise<boolean> {
  try {
    await Deno.lstat(`${dir}/${SOURCE_FILE}`);
    return true;
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      throw err;
    }
    return false;
  }
}

async function* allPhotos(): AsyncGenerator<string> {
  for await (const dirEntry of Deno.readDir(".")) {
    if (dirEntry.isDirectory && await isPhotoDirectory(dirEntry.name)) {
      yield dirEntry.name;
    }
  }
}

async function* argPhotos(): AsyncGenerator<string> {
  for (const arg of Deno.args) {
    if (await isPhotoDirectory(arg)) {
      yield arg;
    }
  }
}

async function copyExif(dir: string) {
  for await (const file of Deno.readDir(dir)) {
    if (file.isFile && file.name != SOURCE_FILE && file.name.endsWith(".jpg")) {
      let description =
        await $`${EXIFTOOL} -ImageDescription ${dir}/${SOURCE_FILE} -args`
          .text();
      const groupMatch = /.*-(\d+).jpg/.exec(file.name);
      if (groupMatch !== null) description += ` (image ${groupMatch[1]})`;
      await $`${EXIFTOOL} -tagsfromfile ${dir}/${SOURCE_FILE} -codedcharacterset=UTF8 ${description} -all ${dir}/${file.name}`;
    }
  }
  console.log(`🏷  Updated metadata for ${dir}.`);
}

if (import.meta.main) {
  const photos = Deno.args.length > 0 ? argPhotos() : allPhotos();
  for await (const photo of photos) {
    await copyExif(photo);
  }
}
