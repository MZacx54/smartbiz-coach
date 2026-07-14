import React, { useState, useRef } from 'react';
import { transcribeAudio } from '../services/geminiService';
import { toast } from 'react-hot-toast';
import { Mic, Square, Loader2 } from 'lucide-react';

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
      
      // Determine best supported MIME type
      let options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/mp4' };
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: options.mimeType });
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast.error("Microphone access failed. Please type your query manually in the text field instead.");
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
      const text = await transcribeAudio(blob);
      if (text && text.trim()) {
        onTranscript(text);
      } else {
        toast.error("No speech detected. Please speak clearly into the mic.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Could not transcribe voice. Please try typing your input.");
    } finally {
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
        className={`w-10 h-10 rounded-full transition-all duration-300 flex items-center justify-center shadow-md relative z-10 cursor-pointer border-0 ${
          isRecording
            ? 'bg-red-500 text-white shadow-red-200 scale-105'
            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
        }`}
        title="Tap to speak (Pidgin, English, Hausa, Yoruba, Igbo supported)"
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isRecording ? (
          <Square className="w-4 h-4 fill-white" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>

      {/* Recording Animation Ring */}
      {isRecording && (
        <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75 -z-0"></span>
      )}

      {isRecording && (
        <div className="absolute left-full ml-3 flex items-center gap-1.5 bg-slate-900/90 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
          <span>Listening...</span>
          {/* Wave animation dots */}
          <div className="flex gap-0.5 ml-1">
            <span className="w-1 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
            <span className="w-1 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
            <span className="w-1 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceInput;