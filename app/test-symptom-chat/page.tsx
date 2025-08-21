'use client';

import React from 'react';
import SymptomChat from '../components/SymptomChat';

export default function TestSymptomChatPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Symptom Chat Test</h1>
        <SymptomChat />
      </div>
    </div>
  );
}
