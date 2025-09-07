import { TabNavigation } from "./utils/TabNavigation";

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

export default TabsLayout;
