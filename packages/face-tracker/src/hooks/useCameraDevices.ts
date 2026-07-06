import { useEffect, useState, useCallback } from 'react';

export function useCameraDevices() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const refresh = useCallback(async () => {
    const list = await navigator.mediaDevices.enumerateDevices();
    setDevices(list.filter((d) => d.kind === 'videoinput'));
  }, []);

  useEffect(() => {
    refresh();
    navigator.mediaDevices.addEventListener('devicechange', refresh);
    return () => navigator.mediaDevices.removeEventListener('devicechange', refresh);
  }, [refresh]);

  return { devices, refresh };
}
