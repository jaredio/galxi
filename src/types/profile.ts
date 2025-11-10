export type ResourceProfileData = Record<string, string>;

export type ProfileField = {
  id: string;
  label: string;
  value: string;
  editable?: boolean;
  iconSrc?: string;
  subtitle?: string;
  badge?: string;
};

export type ProfileSection = {
  id: string;
  title: string;
  items: ProfileField[];
  variant?: 'default' | 'cards';
};

export type ProfileFormSection = {
  id: string;
  title: string;
  fields: Array<{ id: string; label: string; key: string }>;
};

export type ProfileWindowContent = {
  title: string;
  typeLabel: string;
  overview: ProfileField[];
  sections: ProfileSection[];
  connections?: ProfileSection[];
  status?: {
    label: string;
    tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  };
  iconSrc?: string;
  meta?: Array<{ label: string; value: string }>;
};
