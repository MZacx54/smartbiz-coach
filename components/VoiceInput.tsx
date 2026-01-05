import React, { useState, useRef } from 'react';
import { transcribeAudio } from '../services/geminiService';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  placeholder?: string;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' }); // Chrome/Firefox usually use webm
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());

        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);
    try {
        try {
          const text = await transcribeAudio(blob);
          onTranscript(text);
        } catch (error) {
          console.error(error);
          alert("Failed to transcribe audio.");
        } finally {
          setIsProcessing(false);
        }
    } catch (e) {
      setIsProcessing(false);
    }
  };

  const toggleRecording = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={toggleRecording}
        disabled={isProcessing}
        className={`p-3 rounded-full transition-all duration-300 flex items-center justify-center shadow-sm relative z-10 ${isRecording
            ? 'bg-red-500 text-white shadow-red-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        title="Tap to speak (English, Pidgin, Hausa, Yoruba, Igbo)"
      >
        {isProcessing ? (
          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <span className="text-xl">{isRecording ? '⏹' : '🎙️'}</span>
        )}
      </button>

      {/* Recording Animation Ring */}
      {isRecording && (
        <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75 -z-0"></span>
      )}

      {isRecording && (
        <span className="absolute left-full ml-2 text-xs text-red-500 font-bold whitespace-nowrap animate-pulse">
          Recording...
        </span>
      )}
    </div>
  );
};

export default VoiceInput;