import { useNavigate, useLocation } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import { useIsMobile } from "./use-mobile";

interface SwipeNavigationConfig {
  routes: string[];
  enabled?: boolean;
  threshold?: number;
  velocity?: number;
}

export function useSwipeNavigation(config: SwipeNavigationConfig) {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  
  const {
    routes,
    enabled = true,
    threshold = 60,
    velocity = 0.3,
  } = config;

  const currentIndex = routes.findIndex(route => location.pathname === route);

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (!enabled || !isMobile || currentIndex === -1) return;
      
      const nextIndex = currentIndex + 1;
      if (nextIndex < routes.length) {
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        navigate(routes[nextIndex], { replace: false });
      }
    },
    onSwipedRight: () => {
      if (!enabled || !isMobile || currentIndex === -1) return;
      
      const prevIndex = currentIndex - 1;
      if (prevIndex >= 0) {
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        navigate(routes[prevIndex], { replace: false });
      }
    },
    delta: threshold,
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: false,
    swipeDuration: 500,
    touchEventOptions: { passive: true },
  });

  return isMobile && enabled ? handlers : {};
}
