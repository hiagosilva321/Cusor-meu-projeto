/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CACAMBA_CLIENT_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
