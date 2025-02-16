import { KokoroTTS } from "kokoro-js"




const model_id = "onnx-community/Kokoro-82M-v1.0-ONNX";
const tts = await KokoroTTS.from_pretrained(model_id, {
dtype: "q4", // optional values: "fp32", "fp16", "q8", "q4", "q4f16"
device: "cpu", // Optional values: "wasm", "webgpu" (web) or "cpu" (node). If using "webgpu", dtype="fp32" is recommended.
});

const text = "Person in the way detected. Do you want to report this?" ;
const audio = await tts.generate(text, {
// Use tts.list_voices() to list all available voices
voice: "af_heart", 
});
audio.save("5.wav");