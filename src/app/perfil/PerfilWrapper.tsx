"use client";
import dynamicImport from 'next/dynamic';
export const Content = dynamicImport(() => import('./PerfilClient'), { ssr: false });
