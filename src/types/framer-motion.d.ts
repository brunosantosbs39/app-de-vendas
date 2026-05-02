declare module "framer-motion" {
  import type { ComponentType, ReactNode } from "react";

  type MotionComponent = ComponentType<any>;

  export const motion: {
    div: MotionComponent;
    section: MotionComponent;
    button: MotionComponent;
    span: MotionComponent;
    p: MotionComponent;
  };

  export const AnimatePresence: ComponentType<{
    children?: ReactNode;
    mode?: "sync" | "popLayout" | "wait";
    initial?: boolean;
  }>;
}

