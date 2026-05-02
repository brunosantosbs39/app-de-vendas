"use client";
import dynamicImport from "next/dynamic";

const DynamicContent = dynamicImport(() => import("./DashboardClient"), { 
  ssr: false,
  loading: () => <div className="min-h-screen bg-[#0F0F0F]" />
});

export const Content = () => <DynamicContent />;
