import { createReadStream } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';
import type { FileStorage } from './storage.interface';

const KEY_PATTERN = /^[a-z0-9]{2}\/[a-z0-9-]{20,64}$/;

export class LocalFileStorage implements FileStorage {
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private resolve(key: string): string {
    if (!KEY_PATTERN.test(key)) throw new Error('Kunci penyimpanan tidak sah');
    return path.join(this.root, key);
  }

  async put(key: string, data: Buffer): Promise<void> {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, data, { mode: 0o600, flag: 'wx' });
  }

  read(key: string): Promise<Buffer> {
    return readFile(this.resolve(key));
  }

  stream(key: string): Readable {
    return createReadStream(this.resolve(key));
  }

  async remove(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }
}
