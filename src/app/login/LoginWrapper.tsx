"use client";
import dynamicImport from 'next/dynamic';
export const Content = dynamicImport(() => import('./LoginClient'), { ssr: false });
