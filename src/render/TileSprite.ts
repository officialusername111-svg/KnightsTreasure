import { Container, Sprite, Graphics, type Texture } from 'pixi.js';

export type HighlightMode = 'none' | 'selected' | 'target';

const HIGHLIGHT_COLOR = 0xf4d98a;

export class TileSprite extends Container {
  private art: Sprite;
  private highlight: Graphics;

  constructor(texture: Texture) {
    super();
    this.highlight = new Graphics();
    this.addChild(this.highlight);
    this.art = new Sprite(texture);
    this.art.anchor.set(0.5);
    this.addChild(this.art);
    this.eventMode = 'static';
    this.cursor = 'pointer';
  }

  layout(size: number): void {
    this.art.width = size * 0.82;
    this.art.height = size * 0.82;
    this.art.x = size / 2;
    this.art.y = size / 2;
  }

  setTexture(texture: Texture): void {
    this.art.texture = texture;
  }

  setDimmed(dimmed: boolean): void {
    this.art.tint = dimmed ? 0x8a8a8a : 0xffffff;
  }

  setHighlight(size: number, mode: HighlightMode): void {
    this.highlight.clear();
    if (mode === 'none') return;

    const inset = 2;
    const w = size - inset * 2;
    const h = size - inset * 2;

    if (mode === 'selected') {
      this.highlight
        .roundRect(inset, inset, w, h, 6)
        .fill({ color: HIGHLIGHT_COLOR, alpha: 0.12 })
        .stroke({ width: 2, color: HIGHLIGHT_COLOR, alpha: 0.95 });
    } else {
      this.highlight.roundRect(inset, inset, w, h, 6).stroke({ width: 2, color: HIGHLIGHT_COLOR, alpha: 0.5 });
    }
  }
}
