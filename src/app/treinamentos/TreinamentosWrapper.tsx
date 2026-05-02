"use client";
import dynamicImport from 'next/dynamic';
export const Content = dynamicImport(() => import('./TreinamentosClient'), { ssr: false });
