export const TabButton = ({ tab, isActive, onClick }) => (
  <button
    onClick={() => onClick(tab.id)}
    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
      isActive
        ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg"
        : "text-slate-300 hover:text-white hover:bg-slate-700/50"
    }`}
  >
    <span className="text-lg">{tab.icon}</span>
    {tab.label}
  </button>
);

export const TabNavigation = ({ tabs, activeTab, onTabChange }) => (
  <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-2 shadow-2xl">
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <TabButton key={tab.id} tab={tab} isActive={activeTab === tab.id} onClick={onTabChange} />
      ))}
    </div>
  </div>
);
