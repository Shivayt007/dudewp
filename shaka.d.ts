declare module "shaka-player/dist/shaka-player.compiled.js" {
  const shaka: {
    Player: new () => {
      attach: (video: HTMLVideoElement) => Promise<void>;
      load: (uri: string, startTime?: number, mimeType?: string) => Promise<void>;
      destroy: () => Promise<void>;
      configure: (config: unknown) => void;
      getVariantTracks: () => Array<{ id: number; height?: number; language?: string; active?: boolean; bandwidth?: number }>;
      selectVariantTrack: (track: { id: number }, clearBuffer?: boolean) => void;
    }
  };
  export default shaka;
}
