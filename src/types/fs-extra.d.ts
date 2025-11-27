declare module 'fs-extra' {
  import type { ArrayBufferView } from 'node:buffer';
  import type { PathLike, WriteFileOptions } from 'node:fs';

  export function ensureDir(path: PathLike): Promise<void>;
  export function writeJson(
    file: PathLike,
    object: unknown,
    options?: { spaces?: number }
  ): Promise<void>;
  export function writeFile(
    path: PathLike | number,
    data: string | ArrayBufferView,
    options?: WriteFileOptions
  ): Promise<void>;

  const fsExtra: {
    ensureDir: typeof ensureDir;
    writeJson: typeof writeJson;
    writeFile: typeof writeFile;
  };

  export default fsExtra;
}
