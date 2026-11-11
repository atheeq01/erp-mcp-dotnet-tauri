import React from "react";

function Skeleton({
    width = "100%",
    height = "16px",
    className = "",
    style = {},
}) {
    return (
        <div
            className={`bg-[color-mix(in_srgb,var(--paper)_70%,var(--line)_30%)] rounded-[2px] animate-pulse ${className}`}
            style={{ width, height, ...style }}
            aria-hidden="true"
        />
    );
}

export default Skeleton;
