export type ResourceProfileData = Record<string, string>;

export type ProfileField = {
  id: string;
  label: string;
  value: string;
  editable?: boolean;
};

export type ProfileSection = {
  id: string;
  title: string;
  items: ProfileField[];
};

export type ProfileWindowContent = {
  title: string;
  typeLabel: string;
  overview: ProfileField[];
  sections: ProfileSection[];
  status?: {
    label: string;
    tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  };
  iconSrc?: string;
  meta?: Array<{ label: string; value: string }>;
};
