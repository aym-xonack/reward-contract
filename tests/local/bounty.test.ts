import { expect, use } from 'chai'
import {
    bsv,
    findSig,
    FixedArray,
    getDummySig,
    MethodCallOptions,
    PubKey,
} from 'scrypt-ts'
import { Bounty } from '../../src/contracts/bounty'
import { getDummySigner, randomPrivateKey, getDummyUTXO } from './util/txHelper'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

const [aymPriv, aymPub] = randomPrivateKey()
const [baronPriv, baronPub] = randomPrivateKey()

const pubKeys = [aymPub, baronPub].map((pk) =>
    PubKey(pk.toString())
) as FixedArray<PubKey, 2>

const lockUntil = Math.floor(Date.now() / 1000) + 1

let bounty: Bounty

describe('Test SmartContract `Bounty`', () => {
    before(async () => {
        await Bounty.compile()
        bounty = new Bounty(...pubKeys, BigInt(lockUntil))
        await bounty.connect(getDummySigner([aymPriv, baronPriv]))
    })

    it('should pass the select method unit test with two signatures.', async () => {
        const { tx: callTx, atInputIndex } = await bounty.methods.select(
            (sigResps) => {
                return pubKeys.map((pubKey) => {
                    try {
                        return findSig(
                            sigResps,
                            bsv.PublicKey.fromString(pubKey)
                        )
                    } catch (error) {
                        return getDummySig()
                    }
                })
            },
            {
                fromUTXO: getDummyUTXO(),
                pubKeyOrAddrToSign: [aymPub, baronPub],
            } as MethodCallOptions<Bounty>
        )

        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should pass the abandon method unit test successfully.', async () => {
        const { tx: callTx, atInputIndex } = await bounty.methods.abandon(
            (sigResps) => findSig(sigResps, baronPub),
            {
                fromUTXO: getDummyUTXO(),
                pubKeyOrAddrToSign: baronPub,
                lockTime: lockUntil + 1,
            } as MethodCallOptions<Bounty>
        )
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should faile the abandon method without locktime', async () => {
        return expect(
            bounty.methods.abandon((sigResps) => findSig(sigResps, baronPub), {
                fromUTXO: getDummyUTXO(),
                pubKeyOrAddrToSign: baronPub,
            } as MethodCallOptions<Bounty>)
        ).to.be.rejectedWith(
            /wait 24H after auction deadline to claim as abandoned./
        )
    })
})
