import { useState } from 'react';
import * as fabric from 'fabric';
import toast from 'react-hot-toast';
import type { AudioBannerType } from '../types/canvas';

export interface UseScreenShareReturn {
  handleShareScreen: () => Promise<void>;
  audioBannerType: AudioBannerType;
  setAudioBannerType: React.Dispatch<React.SetStateAction<AudioBannerType>>;
}

export function useScreenShare(
  fabricCanvasRef: React.MutableRefObject<fabric.Canvas | null>
): UseScreenShareReturn {
  const [audioBannerType, setAudioBannerType] = useState<AudioBannerType>(null);

  const handleShareScreen = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 2,
        } as any,
      });

      const videoElement = document.createElement('video');
      videoElement.srcObject = stream;
      videoElement.autoplay = true;
      videoElement.muted = true;
      videoElement.playsInline = true;
      await videoElement.play();

      let audioElement: HTMLAudioElement | null = null;
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const audioStream = new MediaStream(audioTracks);
        audioElement = document.createElement('audio');
        audioElement.srcObject = audioStream;
        audioElement.volume = 1;
        audioElement.muted = false;
        audioElement.style.display = 'none';
        document.body.appendChild(audioElement);
        audioElement.play().catch((e) => {
          console.warn('Autoplay de audio bloqueado:', e);
          setAudioBannerType('blocked');
        });
        setAudioBannerType('active');
      } else {
        console.warn('No se capturó audio del tab.');
        setAudioBannerType('no-audio');
      }

      videoElement.onloadedmetadata = () => {
        const width = videoElement.videoWidth || 640;
        const scale = Math.min(1, 800 / width);

        const fabricVideo = new fabric.FabricImage(videoElement, {
          left: canvas.width! / 2,
          top: canvas.height! / 2,
          scaleX: scale,
          scaleY: scale,
          originX: 'center',
          originY: 'center',
          objectCaching: false,
        });

        (fabricVideo as any).id = `video_${Date.now()}`;
        (fabricVideo as any).isVideo = true;
        (fabricVideo as any).stream = stream;
        (fabricVideo as any).audioElement = audioElement;
        (fabricVideo as any).excludeFromSync = true;
        (fabricVideo as any).excludeFromSerialization = true;
        (fabricVideo as any).excludeFromHistory = true;

        canvas.add(fabricVideo);
        canvas.setActiveObject(fabricVideo);
        canvas.renderAll();

        let animFrameId: number;
        const updateLoop = () => {
          if (videoElement.paused || videoElement.ended || !stream.active) {
            cancelAnimationFrame(animFrameId);
            return;
          }
          canvas.requestRenderAll();
          animFrameId = requestAnimationFrame(updateLoop);
        };
        updateLoop();

        videoElement.addEventListener('play', () => { updateLoop(); });
      };

      stream.getVideoTracks()[0].onended = () => {
        setAudioBannerType(null);
        const videoObj = canvas.getObjects().find((o) => (o as any).stream === stream);
        if (videoObj) canvas.remove(videoObj);
        stream.getTracks().forEach((track) => track.stop());
        if (audioElement) {
          audioElement.pause();
          audioElement.srcObject = null;
          audioElement.parentNode?.removeChild(audioElement);
        }
        canvas.renderAll();
      };

      toast.success('Pantalla compartida agregada al pizarrón');
    } catch (err) {
      console.error('Error al iniciar compartición de pantalla:', err);
      toast.error('No se pudo iniciar la compartición de pantalla');
    }
  };

  return { handleShareScreen, audioBannerType, setAudioBannerType };
}
