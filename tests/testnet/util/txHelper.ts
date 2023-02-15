import { bsv, TestWallet, WhatsonchainProvider } from 'scrypt-ts'
import { myPrivateKey } from './privateKey'

export const inputSatoshis = 10000

export const sleep = async (seconds: number) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({})
        }, seconds * 1000)
    })
}

export function randomPrivateKey() {
    const privateKey = bsv.PrivateKey.fromRandom('testnet')
    const publicKey = bsv.PublicKey.fromPrivateKey(privateKey)
    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
    const address = publicKey.toAddress()
    return [privateKey, publicKey, publicKeyHash, address] as const
}

export function getTestnetSigner(
    privateKey?: bsv.PrivateKey | bsv.PrivateKey[]
): TestWallet {
    if (global.testnetSigner === undefined) {
        global.testnetSigner = new TestWallet(
            myPrivateKey,
            new WhatsonchainProvider(bsv.Networks.testnet)
        )
    }
    if (privateKey !== undefined) {
        global.testnetSigner.addPrivateKey(privateKey)
    }
    return global.testnetSigner
}
