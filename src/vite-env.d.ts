/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DIPCA_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
