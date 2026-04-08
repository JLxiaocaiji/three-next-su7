import React from "react";
import LoadingProgress from "@/components/LoadingProgress"

export default function Template({ children }: { children: React.ReactNode }) {
	return <>
    <LoadingProgress />
    {children}
    </>;
}
