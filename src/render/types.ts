export type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Where the renderer gets decoded media from. */
export interface Assets {
  getImage(mediaId: string): CanvasImageSource | undefined;
  /** latest decoded frame for a video clip (call assets.prepare() first) */
  getVideoFrame(clipId: string): CanvasImageSource | undefined;
}
