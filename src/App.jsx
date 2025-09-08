import { useState } from "react";

import { ModelProvider } from "./engine/ModelContext";
import { CreditsTab, PodcastTab, TTSTab } from "./tabs";
import { TabNavigation } from "./tabs/utils/TabNavigation";

const App = () => {
  const [activeTab, setActiveTab] = useState("tts");

  const tabs = [
    { id: "tts", label: "TTS", icon: "🎤", component: TTSTab },
    { id: "podcast", label: "Podcast", icon: "🎙️", component: PodcastTab },
    // { id: 'emotional', label: 'Multi-Style', icon: '🎭', component: MultiStyleTab },
    { id: "credits", label: "Credits", icon: "👥", component: CreditsTab },
  ];

  return (
    <ModelProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-4">
              F5-TTS Web
            </h1>
            <p className="text-slate-300 text-lg">Neural Voice Cloning with Real-Time Generation</p>
            <div className="flex justify-center gap-2 mt-3 flex-wrap">
              <span className="text-xs bg-slate-700/50 text-cyan-300 px-2 py-1 rounded-full">
                100% In-Browser
              </span>
              <span className="text-xs bg-slate-700/50 text-green-300 px-2 py-1 rounded-full">
                Free
              </span>
              <span className="text-xs bg-slate-700/50 text-purple-300 px-2 py-1 rounded-full">
                Open Source
              </span>
              <span className="text-xs bg-slate-700/50 text-amber-300 px-2 py-1 rounded-full">
                Works Offline
              </span>
            </div>
          </div>

          {/* Tabs Layout */}
          <TabsLayout tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </div>
    </ModelProvider>
  );
};

const TabsLayout = ({ tabs, activeTab, setActiveTab }) => {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 shadow-2xl">
        {/* Render all tabs but only show the active one */}
        {tabs.map((tab) => (
          <div key={tab.id} style={{ display: activeTab === tab.id ? "block" : "none" }}>
            <tab.component />
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
