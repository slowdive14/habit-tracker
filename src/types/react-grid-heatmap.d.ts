declare module 'react-grid-heatmap' {
  export interface HeatMapGridProps {
    data: number[][];
    xLabels: string[];
    yLabels: string[];
    cellHeight?: string;
    cellRender?: (x: number, y: number, value: number) => React.ReactNode;
    cellStyle?: (x: number, y: number, value: number) => React.CSSProperties;
  }

  export const HeatMapGrid: React.FC<HeatMapGridProps>;
}
