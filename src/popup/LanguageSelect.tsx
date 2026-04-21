import { setTargetLanguage } from "../lib/cache";

const LANGUAGES = [
  "Japanese",
  "Korean",
  "Chinese (Simplified)",
  "Chinese (Traditional)",
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese (Brazilian)",
  "Portuguese (European)",
  "Russian",
  "Dutch",
  "Polish",
  "Turkish",
  "Arabic",
  "Hindi",
  "Thai",
  "Vietnamese",
  "Indonesian",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Greek",
  "Hebrew",
  "Czech",
  "Ukrainian",
];

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export function LanguageSelect({ value, onChange }: Props) {
  // Include the stored value in the list even if unknown, so the <select>
  // has a matching option and doesn't silently reset.
  const names = LANGUAGES.includes(value) ? LANGUAGES : [value, ...LANGUAGES];
  return (
    <div className="lang-row">
      <label htmlFor="targetLanguage">Target language</label>
      <select
        id="targetLanguage"
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next);
          void setTargetLanguage(next);
        }}
      >
        {names.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  );
}
