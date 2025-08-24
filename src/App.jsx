// App.jsx - Main orchestrator, much smaller
import React, { useState } from "react";

import { ProgressBar, TabNavigation } from "./components";
import { TTSProvider } from "./contexts";
// import { TTSTab, PodcastTab, MultiStyleTab, CreditsTab } from './tabs';
import { CreditsTab, TTSTab } from "./tabs";

const App = () => {
  const [activeTab, setActiveTab] = useState("tts");

  const tabs = [
    { id: "tts", label: "TTS", icon: "🎤", component: TTSTab },
    // { id: 'podcast', label: 'Podcast', icon: '🎙️', component: PodcastTab },
    // { id: 'emotional', label: 'Multi-Style', icon: '🎭', component: MultiStyleTab },
    { id: "credits", label: "Credits", icon: "👥", component: CreditsTab },
  ];

  return (
    <TTSProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-4">
              F5-TTS Web
            </h1>
            <p className="text-slate-300 text-lg">Neural Voice Cloning with Real-Time Generation</p>
          </div>

          <div className="max-w-6xl mx-auto space-y-8">
            <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 shadow-2xl">
              {/* Keep all tabs mounted but hidden - preserves state */}
              <div style={{ display: activeTab === "tts" ? "block" : "none" }}>
                <TTSTab />
              </div>
              {/* <div style={{ display: activeTab === 'podcast' ? 'block' : 'none' }}>
                <PodcastTab />
              </div>
              <div style={{ display: activeTab === 'emotional' ? 'block' : 'none' }}>
                <MultiStyleTab />
              </div> */}
              <div style={{ display: activeTab === "credits" ? "block" : "none" }}>
                <CreditsTab />
              </div>
            </div>
          </div>
        </div>
      </div>
    </TTSProvider>
  );
};

export default App;
