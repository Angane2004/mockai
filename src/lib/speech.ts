// speech.ts
// Utility functions for Text-to-Speech (reading questions aloud)
// and Speech-to-Text (capturing the user's spoken answers).

// Reads text aloud using the browser's built-in speech engine.
// Pass a voiceName like "Google UK English Female" to use a specific voice.
export const speak = (text: string, voiceName?: string) => {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        
        const voices = window.speechSynthesis.getVoices();
        const selectedVoice = voices.find(voice => voice.name.includes(voiceName || ''));
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        window.speechSynthesis.speak(utterance);
    } else {
        console.warn("Web Speech API not supported in this browser.");
    }
};

// Starts listening to the microphone and converts speech to text in real time.
// onResult fires with the final transcript each time the user pauses speaking.
// onEnd fires when recognition stops.
// Returns the recognition object so you can stop it later with stopSpeechRecognition().
export const startSpeechRecognition = (onResult: (text: string) => void, onEnd: () => void) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = true;      // Keep listening until stopped manually
        recognition.interimResults = true;  // Stream partial results while speaking

        recognition.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    onResult(transcript); // Confirmed words — send to caller
                } else {
                    interimTranscript += transcript; // Still being spoken
                }
            }
            // You might want to display interim results, e.g., on a different state
        };

        recognition.onend = () => {
            onEnd();
        };

        recognition.start();
        return recognition; // Return the recognition object so it can be stopped
    } else {
        console.warn("Speech Recognition not supported in this browser.");
        return null;
    }
};

// Stops an active speech recognition session.
export const stopSpeechRecognition = (recognition: any) => {
    if (recognition) {
        recognition.stop();
    }
};