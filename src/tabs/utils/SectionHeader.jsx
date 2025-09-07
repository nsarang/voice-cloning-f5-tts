export const SectionHeader = ({ title, onDemo }) => (
  <h2 className="text-2xl font-semibold text-white mb-6 flex items-center justify-between">
    <span>{title}</span>
    {onDemo && (
      <button
        onClick={onDemo}
        className="text-xs px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-purple-300 rounded-lg transition-all"
      >
        Load Demo
      </button>
    )}
  </h2>
);
