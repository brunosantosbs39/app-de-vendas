"use client";
import dynamicImport from 'next/dynamic';
export const Content = dynamicImport(() => import('./JarvisClient'), { ssr: false });
