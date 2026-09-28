
interface CanvasMiniMapProps {
  isTeacher: boolean;
  showAITutorPanel: boolean;
  miniMapCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  onMiniMapMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMiniMapMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMiniMapMouseUp: () => void;
  onMiniMapMouseLeave: () => void;
}

export const CanvasMiniMap = ({
  isTeacher,
  showAITutorPanel,
  miniMapCanvasRef,
  onMiniMapMouseDown,
  onMiniMapMouseMove,
  onMiniMapMouseUp,
  onMiniMapMouseLeave,
}: CanvasMiniMapProps) => {
  if (!isTeacher) return null;

  return (
    <div
      className="hidden lg:block fixed bottom-6 bg-[#1e2128] rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.5)] border border-white/10 p-3 z-20 transition-all duration-300 ease-in-out"
      style={{
        right: showAITutorPanel ? '420px' : '24px',
      }}
    >
      <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2 text-center">
        Navigator
      </div>
      <div
        className="relative bg-[#13151a] rounded-lg overflow-hidden border border-white/10"
        style={{ width: '150px', height: '100px' }}
      >
        <canvas
          ref={miniMapCanvasRef}
          width={150}
          height={100}
          className="cursor-move rounded"
          onMouseDown={onMiniMapMouseDown}
          onMouseMove={onMiniMapMouseMove}
          onMouseUp={onMiniMapMouseUp}
          onMouseLeave={onMiniMapMouseLeave}
        />
      </div>
    </div>
  );
};
