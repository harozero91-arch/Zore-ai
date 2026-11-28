import { Muxer, ArrayBufferTarget } from "mp4-muxer";

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 10;

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

function makeSlides({ title, employeeName, results }) {
  const slides = [{
    heading: "HASIL PENGGABUNGAN ZORE AI",
    body: [title, "Pemeriksaan akhir dan penggabungan oleh: " + (employeeName || "Manajer ZORE AI")].join("\n\n")
  }];
  const source = String(results[0]?.content || "").trim();
  let finalText = source;

  // HTML deliverables must be presented as readable content, not as raw source code.
  if (/^(?:<!doctype\s+html|<html\b)/i.test(source)) {
    const doc = new DOMParser().parseFromString(source, "text/html");
    doc.querySelectorAll("script,style,noscript,template,svg").forEach(node => node.remove());
    doc.querySelectorAll("[hidden],[aria-hidden='true'],[style*='display:none'],[style*='display: none']")
      .forEach(node => node.remove());
    finalText = String(doc.body?.innerText || doc.body?.textContent || "")
      .replace(/[\t\u00a0]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (!finalText) {
      finalText = "Dokumen HTML final telah diperiksa dan digabungkan. Isi visual interaktif tidak dapat dirender otomatis pada mode presentasi teks ini.";
    }
  }

  const paragraphs = finalText.split(/\n{2,}/);
  let page = "";
  let pageNo = 1;
  for (const paragraph of paragraphs) {
    const candidate = page ? page + "\n\n" + paragraph : paragraph;
    if (candidate.length > 1050 && page) {
      slides.push({ heading: "HASIL AKHIR · BAGIAN " + pageNo++, body: page });
      page = paragraph;
    } else page = candidate;
  }
  if (page) slides.push({ heading: "HASIL AKHIR · BAGIAN " + pageNo, body: page });
  slides.push({
    heading: "PENUTUP",
    body: "Video ini dibuat dari isi hasil akhir gabungan yang diserahkan untuk pemeriksaan. Audio merupakan dubbing narasi berbahasa Indonesia."
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
  ctx.fillText("ZORE AI  /  HASIL GABUNGAN", 82, 100);
  ctx.fillStyle = "#f3d69d";
  ctx.font = "700 38px Arial";
  wrapText(ctx, slide.heading, 1080).slice(0, 2).forEach((line, i) => ctx.fillText(line, 82, 165 + i * 48));
  ctx.fillStyle = "#eadfcf";
  ctx.font = "25px Arial";
  const lines = [];
  for (const paragraph of String(slide.body || "").split("\n")) {
    if (!paragraph.trim()) lines.push("");
    else lines.push(...wrapText(ctx, paragraph, 1080));
  }
  let y = 280;
  for (const line of lines) {
    if (y > 610) break;
    ctx.fillText(line, 82, y);
    y += 36;
  }
  ctx.fillStyle = "#b7a58b";
  ctx.font = "18px Arial";
  ctx.fillText("BAGIAN " + (index + 1) + " / " + total, 82, 660);
}

function decodePcm(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const samples = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
  const floats = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) floats[i] = samples[i] / 32768;
  return floats;
}

export async function createTaskMp4({ title, employeeName, results, audioBase64, sampleRate = 24000 }) {
  if (!Array.isArray(results) || results.length !== 1 || !results[0]?.content?.trim()) {
    throw new Error("MP4 hanya dapat dibuat dari satu hasil penggabungan akhir yang tersimpan.");
  }
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined" || typeof AudioEncoder === "undefined" || typeof AudioData === "undefined") {
    throw new Error("Browser ini belum mendukung encoder MP4 dengan audio. Coba Chrome versi terbaru.");
  }
  if (!audioBase64) throw new Error("Dubbing belum tersedia; MP4 tidak dibuat tanpa audio.");

  const slides = makeSlides({ title, employeeName, results });
  const pcm = decodePcm(audioBase64);
  if (!pcm.length) throw new Error("Audio dubbing kosong.");
  const audioConfig = { codec: "mp4a.40.2", sampleRate, numberOfChannels: 1, bitrate: 96000 };
  const audioSupport = await AudioEncoder.isConfigSupported(audioConfig);
  if (!audioSupport.supported) throw new Error("Perangkat ini belum mendukung encoder AAC untuk audio MP4.");
  const videoConfig = {
    codec: "avc1.42001f", width: WIDTH, height: HEIGHT,
    bitrate: 2200000, framerate: FPS, latencyMode: "quality",
    avc: { format: "avc" }
  };
  const videoSupport = await VideoEncoder.isConfigSupported(videoConfig);
  if (!videoSupport.supported) throw new Error("Perangkat ini belum mendukung encoder H.264 untuk MP4.");

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: "avc", width: WIDTH, height: HEIGHT, frameRate: FPS },
    audio: { codec: "aac", sampleRate, numberOfChannels: 1 },
    fastStart: "in-memory"
  });
  let encoderError = null;
  const videoEncoder = new VideoEncoder({
    output: (chunk, metadata) => muxer.addVideoChunk(chunk, metadata),
    error: error => { encoderError = error; }
  });
  const audioEncoder = new AudioEncoder({
    output: (chunk, metadata) => muxer.addAudioChunk(chunk, metadata),
    error: error => { encoderError = error; }
  });
  videoEncoder.configure(videoConfig);
  audioEncoder.configure(audioConfig);

  const audioFrameSize = 1024;
  let audioTimestamp = 0;
  try {
    for (let offset = 0; offset < pcm.length; offset += audioFrameSize) {
      if (encoderError) throw encoderError;
      const slice = pcm.slice(offset, Math.min(offset + audioFrameSize, pcm.length));
      const data = new AudioData({
        format: "f32",
        sampleRate,
        numberOfFrames: slice.length,
        numberOfChannels: 1,
        timestamp: audioTimestamp,
        data: slice
      });
      audioEncoder.encode(data);
      data.close();
      audioTimestamp += Math.round(slice.length * 1000000 / sampleRate);
    }
    await audioEncoder.flush();
    if (encoderError) throw encoderError;

    const durationSeconds = pcm.length / sampleRate;
    const totalFrames = Math.max(1, Math.ceil(durationSeconds * FPS));
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas video tidak dapat dibuat.");
    let frameTimestamp = 0;
    const frameDuration = 1000000 / FPS;
    let slideIndex = 0;
    let framesOnSlide = Math.ceil(totalFrames / slides.length);
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      if (encoderError) throw encoderError;
      const nextSlide = Math.min(slides.length - 1, Math.floor(frameIndex / framesOnSlide));
      if (nextSlide !== slideIndex || frameIndex === 0) {
        slideIndex = nextSlide;
        drawSlide(ctx, slides[slideIndex], slideIndex, slides.length);
      }
      const frame = new VideoFrame(canvas, { timestamp: frameTimestamp, duration: frameDuration });
      videoEncoder.encode(frame, { keyFrame: frameIndex === 0 || frameIndex % (FPS * 4) === 0 });
      frame.close();
      frameTimestamp += frameDuration;
    }
    await videoEncoder.flush();
    if (encoderError) throw encoderError;
    videoEncoder.close();
    audioEncoder.close();
    muxer.finalize();
    return new Blob([target.buffer], { type: "video/mp4" });
  } catch (error) {
    try { videoEncoder.close(); } catch {}
    try { audioEncoder.close(); } catch {}
    throw error;
  }
}
