import type { ProfileFormSection, ResourceProfileData } from '../types/profile';

type ProfileFormProps = {
  sections: ProfileFormSection[];
  values: ResourceProfileData;
  onChange: (fieldKey: string, value: string) => void;
  hint?: string;
};

export const ProfileForm = ({ sections, values, onChange, hint }: ProfileFormProps) => (
  <div className="node-profile-form">
    {hint && <p className="node-profile-hint">{hint}</p>}
    {sections.map((section) => (
      <section key={section.id} className="node-profile-section">
        <p className="node-profile-section-title">{section.title}</p>
        <div className="node-profile-field-grid">
          {section.fields.map((field) => (
            <label key={field.key}>
              <span>{field.label}</span>
              <input
                value={values[field.key] ?? ''}
                onChange={(event) => onChange(field.key, event.target.value)}
                placeholder="Optional"
              />
            </label>
          ))}
        </div>
      </section>
    ))}
  </div>
);
