export type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Where the renderer gets decoded media from. */
export interface Assets {
  getImage(clipId: string): CanvasImageSource | undefined;
}
