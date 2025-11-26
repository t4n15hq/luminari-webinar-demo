// src/components/UploadTab.jsx

import React, { useState } from 'react';
import FileUpload from './FileUpload';
import openaiService from '../services/openaiService';

export default function UploadTab() {
  const [transcript, setTranscript] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDiagnose = async () => {
    if (!transcript) return;
    setLoading(true);
    setDiagnosis('');

    try {
      const result = await openaiService.diagnoseConversation(transcript);
      setDiagnosis(result);
    } catch (err) {
      setDiagnosis('Failed to get diagnosis. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  // Split into note + metadata block
  const [note, metaBlock = ''] = diagnosis.split(/Extracted Metadata:/i);
  const metaLines = metaBlock
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l);

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-gray-800 text-center">
          Transcript & Diagnosis
        </h1>

        {/* Upload Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <FileUpload onTranscript={setTranscript} />
        </div>

        {/* Transcript + Button */}
        {transcript && (
          <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h2 className="text-2xl font-semibold text-gray-700">Raw Transcript</h2>
            <div className="max-h-48 overflow-y-auto p-4 bg-gray-50 rounded">
              <pre className="whitespace-pre-wrap text-sm text-gray-800">
                {transcript}
              </pre>
            </div>
            <br></br>
            <button
              onClick={handleDiagnose}
              disabled={loading}
              className="mt-2 w-full px-4 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Diagnosing…' : 'Diagnose'}
            </button>
          </div>
        )}
<br></br>
        {/* Diagnosis Card */}
        {diagnosis && (
          <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h2 className="text-2xl font-semibold text-gray-700">Diagnosis</h2>
            <p className="text-gray-800 leading-relaxed">{note.trim()}</p>

            {metaLines.length > 0 && (
              <>
                <h2 className="text-2xl font-semibold text-gray-700">
                  Extracted Metadata
                </h2>
                <div className="space-y-1 text-gray-800">
                  {metaLines.map((line, idx) => (
                    <p key={idx} className="ml-4 text-sm">
                      {line}
                    </p>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


