import { Global, Module } from '@nestjs/common';
import { loadEnv } from '../config/env';
import { BlindIndex } from './blind-index';
import { FieldCipher } from './field-cipher';

@Global()
@Module({
  providers: [
    {
      provide: FieldCipher,
      useFactory: () => {
        const env = loadEnv();
        return FieldCipher.fromHex(env.FIELD_ENC_KEY, env.FIELD_ENC_KEY_VERSION);
      },
    },
    { provide: BlindIndex, useFactory: () => BlindIndex.fromHex(loadEnv().BLIND_INDEX_KEY) },
  ],
  exports: [FieldCipher, BlindIndex],
})
export class CryptoModule {}
