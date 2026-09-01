import { useCallback, useEffect, useRef } from "react";

const DOORBELL_AUDIO_PATH = "/sounds/kitchen-order-bell.mp3";

export const usePendingOrderAlert = (hasPendingOrders: boolean) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isAlertingRef = useRef(false);

  const stopAlert = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
  }, []);

  const playAlert = useCallback(async () => {
    if (!isAlertingRef.current) return;

    let audio = audioRef.current;
    if (!audio) {
      const newAudio = new Audio(DOORBELL_AUDIO_PATH);
      newAudio.loop = true;
      newAudio.preload = "auto";
      newAudio.volume = 0.9;
      audioRef.current = newAudio;
      audio = newAudio;
    }

    if (!audio.paused) return;

    try {
      await audio.play();
    } catch {
      // Browsers may require an interaction before allowing audio.
    }
  }, []);

  useEffect(() => {
    isAlertingRef.current = hasPendingOrders;

    if (!hasPendingOrders) {
      stopAlert();
      return;
    }

    void playAlert();
    const unlockAudio = () => {
      if (audioRef.current?.paused !== false) void playAlert();
    };

    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      stopAlert();
    };
  }, [hasPendingOrders, playAlert, stopAlert]);

  useEffect(() => () => {
    isAlertingRef.current = false;
    stopAlert();
    audioRef.current = null;
  }, [stopAlert]);
};
