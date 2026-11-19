import type { Readable } from 'node:stream';

export const FILE_STORAGE = Symbol('FILE_STORAGE');

/** Abstraksi penyimpanan berkas; implementasi awal disk lokal, dapat diganti penyimpanan objek. */
export interface FileStorage {
  put(key: string, data: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
  stream(key: string): Readable;
  remove(key: string): Promise<void>;
}
