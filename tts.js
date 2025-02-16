const synth = window.speechSynthesis;

// Function to speak text using the first voice that contains "English"
function speakTextWithEnglishVoice(text) {
  const voices = synth.getVoices();
  console.log("Available voices:", voices); // Debug: log all voices

  const englishVoice = voices.find(voice => voice.name.includes("English"));
  if (!englishVoice) {
    console.warn("No English voice found. Using default voice.");
  }

  const utterance = new SpeechSynthesisUtterance(text);
  if (englishVoice) {
    utterance.voice = englishVoice;
  }
  synth.speak(utterance);
}

// Function to ensure voices are loaded before speaking
function initSpeech(text) {
  // If voices are already loaded, speak immediately
  if (synth.getVoices().length !== 0) {
    speakTextWithEnglishVoice(text);
  } else {
    // Otherwise, wait for the voiceschanged event to load and then speak
    synth.addEventListener('voiceschanged', () => {
      speakTextWithEnglishVoice(text);
    });
  }
}

// Wait for a user gesture (click) to start speech synthesis due to browser requirements
document.addEventListener('click', () => {
  initSpeech();
});