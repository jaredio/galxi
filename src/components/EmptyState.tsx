type EmptyStateProps = {
  onCreateNode: () => void;
};

export const EmptyState = ({ onCreateNode }: EmptyStateProps) => (
  <div className="empty-state">
    <h1>Start building your topology.</h1>
    <p>Begin by exploring the canvas and adding the resources you need.</p>
    <button type="button" className="action-button primary" onClick={onCreateNode}>
      Start
    </button>
  </div>
);
