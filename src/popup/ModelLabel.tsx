import { PROVIDERS, type ProviderId } from "../lib/providers";

type Props = {
  provider: ProviderId;
  language: string;
};

export function ModelLabel({ provider, language }: Props) {
  const model = PROVIDERS[provider].defaultModel;
  return (
    <p className="meta">
      <span>
        {model} · → {language} · {__BUILD_VERSION__}
      </span>
    </p>
  );
}
