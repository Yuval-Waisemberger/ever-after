import { useEffect, useState, type ReactNode } from "react";
import { PublicHeader as ActualHeader } from "../../../src/components/layout/public-header";
export function PublicHeader(){
  const [header,setHeader]=useState<ReactNode>(null);
  useEffect(()=>{void ActualHeader().then(setHeader);},[]);
  return header;
}
