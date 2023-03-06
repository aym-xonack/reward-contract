import { Bounty } from '../../src/contracts/bounty'
import {
    getDefaultSigner,
    inputSatoshis,
    randomPrivateKey,
} from './util/txHelper'
import {
    bsv,
    findSig,
    FixedArray,
    getDummySig,
    MethodCallOptions,
    PubKey,
} from 'scrypt-ts'

async function main() {
    await Bounty.compile()

    const [aymPriv, aymPub] = randomPrivateKey()
    const [baronPriv, baronPub] = randomPrivateKey()

    const pubKeys = [aymPub, baronPub].map((pk) =>
        PubKey(pk.toString())
    ) as FixedArray<PubKey, 2>

    const lockUntil = Math.floor(Date.now() / 1000) + 1
    const bounty = new Bounty(...pubKeys, BigInt(lockUntil))
    await bounty.connect(getDefaultSigner([aymPriv, baronPriv]))

    // deploy
    const deployTx = await bounty.deploy(inputSatoshis)
    console.log('AccumulatorMultiSig contract deployed: ', deployTx.id)

    const { tx: callTx } = await bounty.methods.select(
        (sigResps) => {
            return pubKeys.map((pubKey) => {
                try {
                    return findSig(sigResps, bsv.PublicKey.fromString(pubKey))
                } catch (error) {
                    return getDummySig()
                }
            })
        },
        {
            pubKeyOrAddrToSign: [aymPub, baronPub],
        } as MethodCallOptions<Bounty>
    )
    console.log('AccumulatorMultiSig contract called: ', callTx.id)
}

describe('Test SmartContract `AccumulatorMultiSig` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
