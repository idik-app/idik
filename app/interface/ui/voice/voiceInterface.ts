// voiceInterface.ts
export function speak(text: string) {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    const msg = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(msg);
  }
}
