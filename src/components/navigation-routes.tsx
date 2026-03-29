import { MainRoutes } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

interface NavigationRoutesProps {
  isMobile?: boolean;
}

export const NavigationRoutes = ({
  isMobile = false,
}: NavigationRoutesProps) => {
  const location = useLocation();
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });
  const navRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    // Find the active nav item and update underline position
    const activeIndex = MainRoutes.findIndex(route => route.href === location.pathname);
    if (activeIndex !== -1 && navRefs.current[activeIndex]) {
      const activeElement = navRefs.current[activeIndex];
      if (activeElement) {
        const { offsetLeft, offsetWidth } = activeElement;
        setUnderlineStyle({
          left: offsetLeft,
          width: offsetWidth,
        });
      }
    }
  }, [location.pathname]);

  return (
    <div className="relative">
      <ul
        className={cn(
          "flex items-center gap-6 relative",
          isMobile && "items-start flex-col gap-8"
        )}
      >
        {MainRoutes.map((route, index) => (
          <NavLink
            key={route.href}
            to={route.href}
            ref={(el) => (navRefs.current[index] = el)}
            className={({ isActive }) =>
              cn(
                "text-base text-neutral-600 transition-all duration-300 py-2 relative hover:text-blue-500",
                isActive && "text-blue-600 font-semibold"
              )
            }
          >
            {route.label}
          </NavLink>
        ))}

        {/* Animated sliding underline - only show on desktop */}
        {!isMobile && underlineStyle.width > 0 && (
          <div
            className="absolute bottom-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out rounded-full"
            style={{
              left: `${underlineStyle.left}px`,
              width: `${underlineStyle.width}px`,
              transform: 'translateY(2px)',
            }}
          />
        )}
      </ul>
    </div>
  );
};
