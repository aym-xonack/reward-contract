import { use } from 'chai'
import { Reward } from '../../src/contracts/reward'
import { findSig, MethodCallOptions, PubKey, toHex } from 'scrypt-ts'
import chaiAsPromised from 'chai-as-promised'
import {
    getTestnetSigner,
    inputSatoshis,
    randomPrivateKey,
    sleep,
} from './util/txHelper'

use(chaiAsPromised)

const [ownerPrivateKey, ownerPublicKey, , ,] = randomPrivateKey()
const [aymPrivateKey, aymPublicKey, , ,] = randomPrivateKey()
const deadline = Math.round(new Date('2020-01-03').valueOf() / 1000)

async function deploy() {
    await Reward.compile()
    const reward = new Reward(
        PubKey(toHex(ownerPublicKey)),
        PubKey(toHex(aymPublicKey)),
        BigInt(deadline)
    )

    await reward.connect(getTestnetSigner([ownerPrivateKey, aymPrivateKey]))

    // deploy
    const deployTx = await reward.deploy(inputSatoshis)
    console.log('Reward contract deployed: ', deployTx.id)

    return reward
}

async function multisig() {
    // deploy
    const reward = await deploy()
    // call
    const { tx: callTx } = await reward.methods.multisig(
        (sigResps) => findSig(sigResps, ownerPublicKey), // correct userSig
        (sigResps) => findSig(sigResps, aymPublicKey), // correct aymSig
        {
            pubKeyOrAddrToSign: [ownerPublicKey, aymPublicKey],
        } as MethodCallOptions<Reward>
    )
    console.log('Reward `multisig` called: ', callTx.id)
}

async function timelock() {
    // deploy
    const reward = await deploy()
    // call
    const { tx: callTx } = await reward.methods.timelock({
        lockTime: deadline + 86400, // meet the time lock
    } as MethodCallOptions<Reward>)
    console.log('Reward `timelock` called: ', callTx.id)
}

describe('Test SmartContract `Reward` on testnet', () => {
    it('should succeed', async () => {
        await multisig()
        await sleep(5)
        await timelock()
    })
})
