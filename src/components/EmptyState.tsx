type EmptyStateProps = {
  onCreateNode: () => void;
};

export const EmptyState = ({ onCreateNode }: EmptyStateProps) => (
  <div className="empty-state">
    <h1>Start building your topology.</h1>
    <p>Begin by adding a VNet, subnet, or service node to populate the canvas.</p>
    <button type="button" className="action-button primary" onClick={onCreateNode}>
      Create Node
    </button>
  </div>
);
