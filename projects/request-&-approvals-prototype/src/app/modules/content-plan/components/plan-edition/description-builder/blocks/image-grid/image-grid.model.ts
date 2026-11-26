export interface ImageGridItem {
  id: string;
  src: string;
  title: string;
  /** Rich text (HTML). */
  body: string;
}

export interface ImageGridProps {
  items: ImageGridItem[];
}
