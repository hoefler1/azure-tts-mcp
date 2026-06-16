import * as sdk from "microsoft-cognitiveservices-speech-sdk";

// Escape the five XML special characters so arbitrary text is safe inside SSML.
function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Derive the locale (e.g. "es-ES") from a voice name like "es-ES-ElviraNeural".
function localeFromVoice(voice) {
  const parts = voice.split("-");
  return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : voice;
}

// Wrap text in SSML so we can apply a prosody rate. `rate` is an Azure prosody
// rate value, e.g. "+20%", "-10%", or a multiplier like "1.5"/"0.8".
function buildSsml({ text, voice, rate }) {
  const locale = localeFromVoice(voice);
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}">` +
    `<voice name="${voice}">` +
    `<prosody rate="${rate}">${escapeXml(text)}</prosody>` +
    `</voice></speak>`
  );
}

export function synthesizeToFile({ text, voice, outputPath, format, rate }) {
  const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
  const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION;

  return new Promise((resolve, reject) => {
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      AZURE_SPEECH_KEY,
      AZURE_SPEECH_REGION
    );
    speechConfig.speechSynthesisVoiceName = voice;

    // Pick an output format that matches the requested container.
    speechConfig.speechSynthesisOutputFormat =
      format === "wav"
        ? sdk.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm
        : sdk.SpeechSynthesisOutputFormat.Audio24Khz160KBitRateMonoMp3;

    const audioConfig = sdk.AudioConfig.fromAudioFileOutput(outputPath);
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    // When a rate is requested, synthesize via SSML so we can apply <prosody>.
    // Otherwise fall back to plain-text synthesis.
    const useSsml = rate !== undefined && rate !== null && rate !== "";
    const speak = useSsml
      ? synthesizer.speakSsmlAsync.bind(synthesizer)
      : synthesizer.speakTextAsync.bind(synthesizer);
    const payload = useSsml ? buildSsml({ text, voice, rate }) : text;

    speak(
      payload,
      (result) => {
        try {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            resolve(outputPath);
          } else if (result.reason === sdk.ResultReason.Canceled) {
            const details = sdk.CancellationDetails.fromResult(result);
            let msg = `Synthesis canceled: ${details.reason}.`;
            if (details.reason === sdk.CancellationReason.Error) {
              msg += ` ${details.errorDetails}`;
            }
            reject(new Error(msg));
          } else {
            reject(new Error(`Synthesis ended with reason ${result.reason}.`));
          }
        } finally {
          synthesizer.close();
        }
      },
      (err) => {
        synthesizer.close();
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    );
  });
}
