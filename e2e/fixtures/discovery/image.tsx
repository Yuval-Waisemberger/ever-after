import type { ImgHTMLAttributes } from "react";
/* eslint-disable @next/next/no-img-element -- Isolated fixture replaces Next optimization only. */
export default function Image({ fill, priority, ...props }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) { void priority; return <img {...props} alt={props.alt ?? ""} style={fill ? {position:"absolute",width:"100%",height:"100%",inset:0,objectFit:"cover"} : undefined} />; }
