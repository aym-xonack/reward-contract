import { Reward } from '../../src/contracts/reward'
import { dummyUTXO, inputSatoshis, signAndSend } from './util/txHelper'
import { getUtxoManager } from './util/utxoManager'
import { privateKey } from './util/privateKey'
import { bsv, PubKey, Sig, toHex } from 'scrypt-ts'

const publicKey = privateKey.publicKey
const pubKey = PubKey(toHex(publicKey))

const aymPrivateKey = bsv.PrivateKey.fromRandom('testnet')
const aymPublicKey = aymPrivateKey.publicKey
const aymPubKey = PubKey(toHex(aymPublicKey))

const winnerPrivateKey = bsv.PrivateKey.fromRandom('testnet')
const winnerPublicKey = aymPrivateKey.publicKey

describe('Test `Reward` SmartContract', () => {
    before(async () => {
        await Reward.compile()
    })

    it('pass - valid multisig unlock', async () => {
        await multisigTest()
    })

    it('pass - valid timelock unlock', async () => {
        await refundTest()
    })
})

async function multisigTest() {
    const utxoMgr = await getUtxoManager()
    const utxos = await utxoMgr.getUtxos()

    const futureDeadline = new Date('2030-01-03')
    const futureDeadlineUnix = BigInt(futureDeadline.valueOf() / 1000)

    const instance = new Reward(pubKey, aymPubKey, futureDeadlineUnix)

    // deploy
    const unsignedDeployTx = instance.getDeployTx(utxos, inputSatoshis)
    const deployTx = await signAndSend(unsignedDeployTx)
    console.log('Submit deploy tx:', deployTx.id)
    // collect the new p2pkh utxo if it exists in `deployTx`
    utxoMgr.collectUtxoFrom(deployTx)

    // TODO: fix dummy sigs
    const userSig = Sig('user')
    const aymSig = Sig('aym')

    const unsignedMultisigTx = instance.getMultisigTx(
        userSig,
        aymSig,
        winnerPublicKey,
        deployTx
    )
    const multisigTx = await signAndSend(unsignedMultisigTx)
    console.log('Multisig call for winner ', winnerPublicKey, '.')
    console.log('TX ID: ', multisigTx.id)
}

async function refundTest() {
    const utxoMgr = await getUtxoManager()
    const utxos = await utxoMgr.getUtxos()

    const futureDeadline = new Date('2030-01-03')
    const futureDeadlineUnix = BigInt(futureDeadline.valueOf() / 1000)

    const instance = new Reward(pubKey, aymPubKey, futureDeadlineUnix)

    // deploy
    const unsignedDeployTx = instance.getDeployTx(utxos, inputSatoshis)
    const deployTx = await signAndSend(unsignedDeployTx)
    console.log('Submit deploy tx:', deployTx.id)
    // collect the new p2pkh utxo if it exists in `deployTx`
    utxoMgr.collectUtxoFrom(deployTx)

    const unsignedRefundTx = instance.getRefundTx(deployTx)
    const refundTx = await signAndSend(unsignedRefundTx)
    console.log('Refund call for ', publicKey, '.')
    console.log('TX ID: ', refundTx.id)
}
