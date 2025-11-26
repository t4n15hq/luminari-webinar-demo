import React, { useState } from 'react';
import openaiService from '../../services/openaiService';

export default function FileUpload({ onTranscript }) {
  const [loading, setLoading] = useState(false);

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      let text;
      if (file.type.startsWith('text') || file.name.endsWith('.txt')) {
        text = await file.text();
      } else if (file.type.startsWith('audio')) {
        text = await openaiService.transcribeAudio(file);
      } else {
        // TODO: Replace with user-friendly notification system
        // alert('Only .txt or audio files are supported.');
        return;
      }
      onTranscript(text);
    } catch (err) {
      // TODO: Replace with user-friendly notification system
      // alert('Failed to process file; check console for details.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="p-4 border rounded-md">
      <label className="block mb-2 font-medium">
        Upload transcript (.txt) or audio (mp3/wav):
      </label>
      <input
        type="file"
        accept=".txt,audio/*"
        onChange={handleChange}
        disabled={loading}
        className="block"
      />
      {loading && <p className="mt-2 italic">Processing…</p>}
    </div>
  );
}