import React from "react";
import styles from "./Skeleton.module.css";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  style?: React.CSSProperties;
}

export default function Skeleton({
  className = "",
  width,
  height,
  borderRadius,
  style = {},
}: SkeletonProps) {
  const combinedStyle: React.CSSProperties = {
    ...style,
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...(borderRadius ? { borderRadius } : {}),
  };

  return <div className={`${styles.skeleton} ${className}`} style={combinedStyle} />;
}
