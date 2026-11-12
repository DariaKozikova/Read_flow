/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />
declare module '*.css';
declare module '*?raw' {
  const content: string;
  export default content;
}
interface Window {
  api: import('./shared').ReadingFlowApi;
}
