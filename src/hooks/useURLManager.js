import { useCallback, useEffect, useRef } from "react";

export const useObjectURLManager = () => {
  const blobUrlsRef = useRef(new Set());

  const createBlobUrl = useCallback((blob) => {
    const url = URL.createObjectURL(blob);
    blobUrlsRef.current.add(url);
    return url;
  }, []);

  const revokeBlobUrl = useCallback((url) => {
    if (url) {
      URL.revokeObjectURL(url);
      blobUrlsRef.current.delete(url);
    }
  }, []);

  useEffect(() => {
    const urls = blobUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  return {
    createBlobUrl,
    revokeBlobUrl,
  };
};
