import { expect, use } from 'chai'
import { Reward } from '../../src/contracts/reward'
import {
    findSig,
    getDummySig,
    MethodCallOptions,
    PubKey,
    toHex,
} from 'scrypt-ts'
import { getDummySigner, getDummyUTXO, randomPrivateKey } from './util/txHelper'
import chaiAsPromised from 'chai-as-promised'

use(chaiAsPromised)

describe('Test SmartContract `Demo`', () => {
    const [ownerPrivateKey, ownerPublicKey, , ,] = randomPrivateKey()
    const [aymPrivateKey, aymPublicKey, , ,] = randomPrivateKey()
    const deadline = Math.round(new Date('2020-01-03').valueOf() / 1000)

    let reward: Reward

    before(async () => {
        await Reward.compile()
        reward = new Reward(
            PubKey(toHex(ownerPublicKey)),
            PubKey(toHex(aymPublicKey)),
            BigInt(deadline)
        )

        await reward.connect(getDummySigner([ownerPrivateKey, aymPrivateKey]))
    })

    it('should pass `multisig`', async () => {
        const { tx: callTx, atInputIndex } = await reward.methods.multisig(
            (sigResps) => findSig(sigResps, ownerPublicKey), // correct userSig
            (sigResps) => findSig(sigResps, aymPublicKey), // correct aymSig
            {
                fromUTXO: getDummyUTXO(),
                pubKeyOrAddrToSign: [ownerPublicKey, aymPublicKey],
            } as MethodCallOptions<Reward>
        )
        const result = callTx.verifyInputScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should throw `multisig`', async () => {
        return expect(
            reward.methods.multisig(
                (sigResps) => findSig(sigResps, ownerPublicKey),
                () => getDummySig(), // !!! incorrect aymSig
                {
                    fromUTXO: getDummyUTXO(),
                    pubKeyOrAddrToSign: ownerPublicKey,
                } as MethodCallOptions<Reward>
            )
        ).to.be.rejectedWith(/wrong Aym signature/)
    })

    it('should pass `timelock`', async () => {
        const { tx: callTx, atInputIndex } = await reward.methods.timelock({
            fromUTXO: getDummyUTXO(),
            lockTime: deadline + 86400, // meet the time lock
        } as MethodCallOptions<Reward>)
        const result = callTx.verifyInputScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should throw `timelock`', async () => {
        return expect(
            reward.methods.timelock({
                fromUTXO: getDummyUTXO(),
                lockTime: deadline + 86399, // !!! not meet the time lock
            } as MethodCallOptions<Reward>)
        ).to.be.rejectedWith(
            /wait 24H after auction deadline to claim as abandoned./
        )
    })
})
