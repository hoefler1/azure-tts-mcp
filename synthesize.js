import * as sdk from "microsoft-cognitiveservices-speech-sdk";

export function synthesizeToFile({ text, voice, outputPath, format }) {
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

    synthesizer.speakTextAsync(
      text,
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
