import { CodePromise } from '@polkadot/api-contract';
import type { KeyringPair } from '@polkadot/keyring/types';
import type { ApiPromise } from '@polkadot/api';
import { genValidContractOptionsWithValue, _signAndSend, SignAndSendSuccessResponse } from '@c-forge/typechain-types';
import type { ContractOptions } from '@polkadot/api-contract/types';
import type { WeightV2 } from '@polkadot/types/interfaces';
import type * as ArgumentTypes from '../types-arguments/vester';
import Vester from '../contracts/vester';
import { getContractObjectWrapper } from '../shared/utils';
import type BN from 'bn.js';
import FsAPI from 'fs';
import PathAPI from 'path';

const fileName = 'vester';

export default class VesterDeployer {
  readonly nativeAPI: ApiPromise;
  readonly signer: KeyringPair;

  constructor(nativeAPI: ApiPromise, signer: KeyringPair) {
    this.nativeAPI = nativeAPI;
    this.signer = signer;
  }

  private getWasm() {
    try {
      return FsAPI.readFileSync(PathAPI.resolve(__dirname, `../artifacts/${fileName}.wasm`));
    } catch (_) {
      console.warn(`No wasm file found for ${fileName}`);
    }
    const contractFileParsed = JSON.parse(FsAPI.readFileSync(PathAPI.resolve(__dirname, `../artifacts/${fileName}.contract`)).toString());
    return contractFileParsed.source.wasm;
  }

  private createCodePromise(): CodePromise {
    const abi = JSON.parse(FsAPI.readFileSync(PathAPI.resolve(__dirname, `../artifacts/${fileName}.json`)).toString());
    const wasm = this.getWasm();
    return new CodePromise(this.nativeAPI, abi, wasm);
  }

  /**
   * Deploy contract's code
   *
   * @param { BN | null | undefined } [storageDepositLimit],
   * @param { 'Enforced' | 'Relaxed' | number } [determinism],
   */
  async deployCode(storageDepositLimit: BN | null = null, determinism: 'Enforced' | 'Relaxed' | number = 0) {
    const codePromise = this.createCodePromise();

    const tx = this.nativeAPI.tx.contracts.uploadCode!(codePromise.code, storageDepositLimit, determinism);
    let response;

    try {
      response = await _signAndSend(this.nativeAPI.registry, tx, this.signer, undefined, (event: any) => event);
    } catch (error) {
      console.log(error);
    }

    return response as SignAndSendSuccessResponse;
  }

  /**
   * new
   *
   */
  async new(__options?: ContractOptions) {
    const codePromise = this.createCodePromise();

    const gasLimit = (await genValidContractOptionsWithValue(this.nativeAPI, __options)).gasLimit as WeightV2 as any;

    const storageDepositLimit = __options?.storageDepositLimit;
    const tx = codePromise.tx['new']!({ gasLimit, storageDepositLimit, value: __options?.value });
    let response;

    try {
      response = await _signAndSend(this.nativeAPI.registry, tx, this.signer, undefined, (event: any) => event);
    } catch (error) {
      console.log(error);
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const address = (response as SignAndSendSuccessResponse)!.result!.contract.address.toString();

    const contractObj = getContractObjectWrapper(this.nativeAPI, Vester, address, this.signer);
    return {
      result: response as SignAndSendSuccessResponse,
      contract: contractObj,
    };
  }
}
