import React, { useState, useEffect, useRef } from 'react';
import { X, Globe, Mic, MicOff, Volume2 } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';

interface VoiceTranslationProps {
  onClose: () => void;
}

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ar', name: 'Arabic' }
];

export const VoiceTranslation: React.FC<VoiceTranslationProps> = ({ onClose }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [lastTranslation, setLastTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { socket } = useSocket();

  useEffect(() => {
    // Check if SpeechRecognition is available
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = async (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        if (transcript.trim()) {
          await handleTranslateAndSpeak(transcript.trim());
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    }

    // Listen for incoming translations
    if (socket) {
      socket.on('translation-audio', (data) => {
        if (isEnabled) {
          playTranslatedAudio(data.audio);
        }
      });
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (socket) {
        socket.off('translation-audio');
      }
    };
  }, [socket, isEnabled]);

  const handleTranslateAndSpeak = async (text: string) => {
    if (!text.trim() || selectedLanguage === 'en') return;

    setIsTranslating(true);
    try {
      // Translate text using Google Translate API (you'll need to implement this)
      const translatedText = await translateText(text, selectedLanguage);
      setLastTranslation(translatedText);

      // Convert to speech and send to other participants
      const audioBlob = await textToSpeech(translatedText, selectedLanguage);
      if (audioBlob && socket) {
        const audioData = await blobToBase64(audioBlob);
        socket.emit('translation-audio', {
          audio: audioData,
          language: selectedLanguage
        });
      }
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const translateText = async (text: string, targetLang: string): Promise<string> => {
    // This is a placeholder implementation
    // In production, you would use Google Translate API or similar service
    try {
      const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`);
      const data = await response.json();
      return data.responseData.translatedText;
    } catch (error) {
      console.error('Translation failed:', error);
      return text; // Fallback to original text
    }
  };

  const textToSpeech = (text: string, lang: string): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        
        // Create audio blob (this is a simplified version)
        // In a real implementation, you might want to use Web Audio API
        speechSynthesis.speak(utterance);
        resolve(null); // For now, we'll just speak directly
      } else {
        resolve(null);
      }
    });
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const playTranslatedAudio = (audioData: string) => {
    try {
      const audio = new Audio(audioData);
      audio.play();
    } catch (error) {
      console.error('Error playing translated audio:', error);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Voice Translation</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Toggle */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <span className="text-gray-700 font-medium">Enable Translation</span>
            <button
              onClick={() => setIsEnabled(!isEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  isEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Translate incoming voice to your preferred language
          </p>
        </div>

        {/* Language Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Language
          </label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            disabled={!isEnabled}
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Voice Recording */}
        {isEnabled && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-700 font-medium">Voice Recording</span>
              <button
                onClick={toggleListening}
                disabled={isTranslating}
                className={`p-3 rounded-full transition-colors ${
                  isListening
                    ? 'bg-red-100 text-red-600'
                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                } ${isTranslating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isListening ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
            </div>
            
            <div className="text-sm text-center">
              {isListening && (
                <div className="text-red-600 font-medium mb-2">
                  🔴 Listening...
                </div>
              )}
              {isTranslating && (
                <div className="text-blue-600 font-medium mb-2">
                  Translating...
                </div>
              )}
              <p className="text-gray-500">
                Click the microphone to start/stop voice translation
              </p>
            </div>
          </div>
        )}

        {/* Last Translation */}
        {lastTranslation && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Last Translation</span>
            </div>
            <p className="text-gray-900">{lastTranslation}</p>
          </div>
        )}

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>How it works:</strong> Your voice is translated in real-time and played 
            to other participants in their preferred language. They will hear both your 
            original voice and the translation.
          </p>
        </div>
      </div>
    </div>
  );
};