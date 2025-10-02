// A basic example for Text-to-Speech (TTS) and Speech-to-Text (STT)
// This is a starting point, you may need to install libraries or configure a cloud service for a production app.

// TextToSpeech.ts
export const speak = (text: string, voiceName?: string) => {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Find a specific voice if requested
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

// SpeechToText.ts
export const startSpeechRecognition = (onResult: (text: string) => void, onEnd: () => void) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    onResult(transcript);
                } else {
                    interimTranscript += transcript;
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

export const stopSpeechRecognition = (recognition: any) => {
    if (recognition) {
        recognition.stop();
    }
};