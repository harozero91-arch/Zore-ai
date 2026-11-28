import { Muxer, ArrayBufferTarget } from "mp4-muxer";

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 5;
const SLIDE_SECONDS = 4;

function wrapText(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? line + " " + word : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function makeSlides({ title, instructions, employeeName, results }) {
  const slides = [{
    heading: "HASIL PEKERJAAN ZORE AI",
    body: [title, employeeName ? "Penanggung jawab: " + employeeName : "", instructions || ""].filter(Boolean).join("\n\n")
  }];
  for (const result of results) {
    const text = String(result.content || "").trim();
    const paragraphs = text.split(/\n{2,}/);
    let page = "";
    let pageNumber = 1;
    for (const paragraph of paragraphs) {
      const candidate = page ? page + "\n\n" + paragraph : paragraph;
      if (candidate.length > 1050 && page) {
        slides.push({ heading: "HASIL KERJA · BAGIAN " + pageNumber++, body: page });
        page = paragraph;
      } else page = candidate;
    }
    if (page) slides.push({ heading: "HASIL KERJA · BAGIAN " + pageNumber, body: page });
  }
  slides.push({
    heading: "RINGKASAN DOKUMEN",
    body: "Video ini disusun dari hasil AI yang tersimpan pada tugas tersebut.\n\nPeriksa laporan lengkap di ZORE AI untuk melihat versi, catatan, dan status persetujuan."
  });
  return slides;
}

function drawSlide(ctx, slide, index, total) {
  ctx.fillStyle = "#17130f";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#49331f");
  gradient.addColorStop(1, "#17130f");
  ctx.fillStyle = gradient;
  ctx.fillRect(28, 28, WIDTH - 56, HEIGHT - 56);
  ctx.strokeStyle = "#c6a15b";
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, WIDTH - 56, HEIGHT - 56);
  ctx.fillStyle = "#d9b978";
  ctx.font = "700 23px Arial";
  ctx.fillText("ZORE AI  /  DOKUMEN HASIL KERJA", 82, 100);
  ctx.fillStyle = "#f3d69d";
  ctx.font = "700 38px Arial";
  const headingLines = wrapText(ctx, slide.heading, 1080);
  headingLines.slice(0, 2).forEach((line, i) => ctx.fillText(line, 82, 165 + i * 48));
  ctx.fillStyle = "#eadfcf";
  ctx.font = "26px Arial";
  const bodyLines = [];
  for (const paragraph of String(slide.body || "").split("\n")) {
    if (!paragraph.trim()) bodyLines.push("");
    else bodyLines.push(...wrapText(ctx, paragraph, 1080));
  }
  let y = 280;
  for (const line of bodyLines) {
    if (y > 610) break;
    ctx.fillText(line, 82, y);
    y += 38;
  }
  ctx.fillStyle = "#b7a58b";
  ctx.font = "18px Arial";
  ctx.fillText("BAGIAN " + (index + 1) + " / " + total, 82, 660);
}

export async function createTaskMp4({ title, instructions, employeeName, results }) {
  if (!Array.isArray(results) || !results.length) {
    throw new Error("Belum ada hasil AI yang tersimpan untuk dibuat menjadi video.");
  }
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") {
    throw new Error("Browser ini belum mendukung ekspor MP4 langsung. Coba gunakan Chrome versi terbaru.");
  }

  const slides = makeSlides({ title, instructions, employeeName, results });
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas video tidak dapat dibuat.");

  const codec = "avc1.42001f";
  const config = {
    codec,
    width: WIDTH,
    height: HEIGHT,
    bitrate: 2200000,
    framerate: FPS,
    latencyMode: "quality",
    avc: { format: "avc" }
  };
  const support = await VideoEncoder.isConfigSupported(config);
  if (!support.supported) {
    throw new Error("Perangkat atau browser ini tidak mendukung encoder H.264 untuk MP4.");
  }

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: "avc", width: WIDTH, height: HEIGHT, frameRate: FPS },
    fastStart: "in-memory"
  });
  let encoderError = null;
  const encoder = new VideoEncoder({
    output: (chunk, metadata) => muxer.addVideoChunk(chunk, metadata),
    error: error => { encoderError = error; }
  });
  encoder.configure(config);

  let timestamp = 0;
  const frameDuration = 1000000 / FPS;
  try {
    for (let slideIndex = 0; slideIndex < slides.length; slideIndex++) {
      drawSlide(ctx, slides[slideIndex], slideIndex, slides.length);
      for (let frameIndex = 0; frameIndex < FPS * SLIDE_SECONDS; frameIndex++) {
        if (encoderError) throw encoderError;
        const frame = new VideoFrame(canvas, {
          timestamp,
          duration: frameDuration
        });
        encoder.encode(frame, { keyFrame: frameIndex === 0 });
        frame.close();
        timestamp += frameDuration;
      }
      await encoder.flush();
    }
    await encoder.flush();
    if (encoderError) throw encoderError;
    encoder.close();
    muxer.finalize();
    return new Blob([target.buffer], { type: "video/mp4" });
  } catch (error) {
    try { encoder.close(); } catch {}
    throw error;
  }
}
