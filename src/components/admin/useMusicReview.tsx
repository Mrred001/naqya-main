import { useCallback, useEffect, useRef, useState } from "react";
import { MusicReviewDialog, type MusicReview } from "./MusicReviewDialog";

export function useMusicReview() {
  const [request, setRequest] = useState<{ url: string; title: string } | null>(null);
  const resolver = useRef<((review: MusicReview | null) => void) | null>(null);
  const finish = useCallback((review: MusicReview | null) => {
    resolver.current?.(review);
    resolver.current = null;
    setRequest(null);
  }, []);
  useEffect(
    () => () => {
      resolver.current?.(null);
      resolver.current = null;
    },
    [],
  );
  const requestMusicReview = useCallback((url: string, title: string) => {
    resolver.current?.(null);
    return new Promise<MusicReview | null>((resolve) => {
      resolver.current = resolve;
      setRequest({ url, title });
    });
  }, []);
  return {
    requestMusicReview,
    musicReviewDialog: request ? (
      <MusicReviewDialog youtubeUrl={request.url} title={request.title} onComplete={finish} />
    ) : null,
  };
}
