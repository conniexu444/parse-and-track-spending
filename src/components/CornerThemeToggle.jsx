import { useTheme } from "../hooks/useTheme";
import { memo, useCallback, useMemo, useState } from "react";

/**
 * Sun icon component for light mode
 * @param {Object} props - Component props
 * @param {string} props.className - CSS class name
 * @param {Object} props.style - Inline styles
 */
const SunIcon = memo(({ className, style }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
        aria-hidden="true"
    >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
    </svg>
));

SunIcon.displayName = "SunIcon";

/**
 * Moon icon component for dark mode
 * @param {Object} props - Component props
 * @param {string} props.className - CSS class name
 * @param {Object} props.style - Inline styles
 */
const MoonIcon = memo(({ className, style }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
        aria-hidden="true"
    >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
));

MoonIcon.displayName = "MoonIcon";

/**
 * Theme toggle button component positioned in the top-right corner
 * Provides visual feedback with animated icon transitions
 */
export const CornerThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();
    const [isHovered, setIsHovered] = useState(false);

    // Memoize static styles to prevent recreation on every render
    const containerStyle = useMemo(
        () => ({
            position: "absolute",
            top: "20px",
            right: "20px",
            zIndex: 100,
        }),
        []
    );

    const baseButtonStyle = useMemo(
        () => ({
            position: "relative",
            height: "56px",
            width: "40px",
            overflow: "hidden",
            borderRadius: "9999px",
            background: "var(--card-bg)",
            padding: "8px",
            border: "1px solid var(--border-color, rgba(128, 128, 128, 0.2))",
            cursor: "pointer",
            transition: "transform 150ms ease",
        }),
        []
    );

    // Compute button style with hover state
    const buttonStyle = useMemo(
        () => ({
            ...baseButtonStyle,
            transform: isHovered ? "scale(1.1)" : "scale(1)",
        }),
        [baseButtonStyle, isHovered]
    );

    /**
     * Generate icon styles based on active state and position
     * @param {boolean} isActive - Whether this icon represents the current theme
     * @param {boolean} isTop - Whether the icon is positioned at the top
     * @returns {Object} Style object for the icon
     */
    const getIconStyle = useCallback((isActive, isTop) => ({
        width: "20px",
        height: "20px",
        color: "var(--text-color)",
        transition: "all 300ms ease",
        position: "absolute",
        left: "50%",
        transform: `translateX(-50%) ${
            isActive
                ? "translateY(0) scale(1)"
                : isTop
                ? "translateY(-32px) scale(0.9)"
                : "translateY(32px) scale(0.75)"
        }`,
        opacity: isActive ? 1 : 0.5,
        ...(isTop ? { top: "8px" } : { bottom: "8px" }),
    }), []);

    // Memoize icon styles to prevent recalculation
    const sunIconStyle = useMemo(
        () => getIconStyle(theme === "light", true),
        [theme, getIconStyle]
    );

    const moonIconStyle = useMemo(
        () => getIconStyle(theme === "dark", false),
        [theme, getIconStyle]
    );

    // Memoize event handlers to prevent recreation
    const handleMouseEnter = useCallback(() => {
        setIsHovered(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
    }, []);

    // Memoize aria-label to prevent recreation
    const ariaLabel = useMemo(
        () =>
            theme === "light"
                ? "Switch to dark mode"
                : "Switch to light mode",
        [theme]
    );

    return (
        <div style={containerStyle}>
            <button
                type="button"
                onClick={toggleTheme}
                style={buttonStyle}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                aria-label={ariaLabel}
            >
                <SunIcon style={sunIconStyle} />
                <MoonIcon style={moonIconStyle} />
            </button>
        </div>
    );
};

export default CornerThemeToggle;
