// Shared types and utilities for CanvasEditor and related components

export interface CanvasEditorProps {
  slideId: string;
  initialData?: string;
  onSave: (canvasData: string) => Promise<void>;
  onChange?: (canvasData: string) => void;
  isReadOnly?: boolean;
  sessionId?: string | null;
  onParticipantsChange?: (
    count: number,
    list?: Array<{ clientId: number; name: string; color: string }>,
    clientId?: number
  ) => void;
  enforceOwnership?: boolean;
  isTeacher?: boolean;
  onPermissionsReady?: (updateFn: (allow: boolean) => void) => void;
  onPermissionsChange?: (allowDraw: boolean) => void;
  classId?: string | null;
  topicId?: string | null;
  currentSlideIndex?: number;
  onSlideChange?: (index: number) => void;
  totalSlides?: number;
  onReloadSlides?: () => Promise<void>;
}

/** Returns true for input/textarea/select/contenteditable targets — used to
 *  prevent keyboard shortcuts from firing while the user is typing. */
export const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return (
    target.isContentEditable ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT'
  );
};

export interface ShortcutEntry {
  desc: string;
  key: string;
}

export const CANVAS_SHORTCUTS: ShortcutEntry[] = [
  { desc: 'Seleccionar', key: 'V' },
  { desc: 'Lapiz', key: 'P' },
  { desc: 'Rectangulo', key: 'R' },
  { desc: 'Circulo', key: 'C' },
  { desc: 'Linea', key: 'L' },
  { desc: 'Flecha', key: 'A' },
  { desc: 'Texto', key: 'T' },
  { desc: 'Imagen', key: 'I' },
  { desc: 'Borrador', key: 'E' },
  { desc: 'Mano / Pan', key: 'H o Espacio' },
  { desc: 'Deshacer', key: 'Ctrl + Z' },
  { desc: 'Rehacer', key: 'Ctrl + Y' },
  { desc: 'Copiar', key: 'Ctrl + C' },
  { desc: 'Pegar', key: 'Ctrl + V' },
  { desc: 'Eliminar', key: 'Delete' },
  { desc: 'Guardar', key: 'Ctrl + S' },
  { desc: 'Zoom', key: 'Ctrl + Rueda' },
  { desc: 'Ver atajos', key: '?' },
  { desc: 'Cerrar panel', key: 'Esc' },
];
