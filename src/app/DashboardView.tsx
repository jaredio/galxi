import { DashboardPage } from '../components/DashboardPage';
import type { DashboardEntity } from '../components/DashboardPage';
import type { CanvasGroup, GroupLink, NetworkLink, NetworkNode } from '../types/graph';
import type { DashboardData } from '../lib/dashboardData';

type ProfileContext = {
  nodes: NetworkNode[];
  groups: CanvasGroup[];
  links: NetworkLink[];
  groupLinks: GroupLink[];
};

export type DashboardViewModel = {
  summary: DashboardData | null;
  nodes: NetworkNode[];
  groups: CanvasGroup[];
  links: NetworkLink[];
  groupLinks: GroupLink[];
  onFocusOnCanvas: (entity: DashboardEntity) => void;
  profileContext: ProfileContext;
};

type DashboardViewProps = {
  model: DashboardViewModel;
};

export const DashboardView = ({ model }: DashboardViewProps) => {
  if (!model.summary) {
    return null;
  }

  return (
    <DashboardPage
      data={model.summary}
      nodes={model.nodes}
      groups={model.groups}
      links={model.links}
      groupLinks={model.groupLinks}
      onFocusOnCanvas={model.onFocusOnCanvas}
      profileContext={model.profileContext}
    />
  );
};
