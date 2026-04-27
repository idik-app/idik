import "react";

declare module "react" {
  interface StyleHTMLAttributes<T> {
    /** styled-jsx (bundled with Next.js) */
    jsx?: boolean;
    global?: boolean;
  }
}

export {};
