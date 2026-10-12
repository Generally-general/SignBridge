import React from 'react';

export const Skeleton = ({ className = '' }) => {
  return <div className={`bg-muted rounded-standard animate-pulse ${className}`} />;
};

export const SkeletonText = ({ lines = 1, className = '' }) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
};