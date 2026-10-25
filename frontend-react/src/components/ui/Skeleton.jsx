import React from "react";

export const Skeleton = ({ className = "" }) => {
  return (
    <div className={`bg-muted rounded-standard animate-pulse ${className}`} />
  );
};
