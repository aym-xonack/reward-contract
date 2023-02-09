import {
    assert,
    method,
    PubKey,
    prop,
    SmartContract,
    Sig,
    bsv,
} from 'scrypt-ts'
import { UTXO } from '../types'

export class Reward extends SmartContract {
    private balance: number

    @prop()
    owner: PubKey

    @prop()
    aym: PubKey

    @prop()
    deadline: bigint //UNIX time

    @prop()
    abandoned: bigint //UNIX time

    constructor(owner: PubKey, aym: PubKey, deadline: bigint) {
        super(owner, aym, deadline)

        this.owner = owner
        this.aym = aym
        this.deadline = deadline //UNIX time
        this.abandoned = deadline + 86400n
    }

    @method()
    public multisig(userSig: Sig, aymSig: Sig) {
        assert(
            this.checkSig(userSig, this.owner),
            'wrong signiture for bounty owner.'
        )
        assert(this.checkSig(aymSig, this.aym), 'wrong Aym signature')
    }

    @method()
    public timelock() {
        assert(
            this.ctx.locktime >= this.abandoned,
            'wait 24H after auction deadline to claim as abandoned.'
        )
    }

    getDeployTx(utxos: UTXO[], initBalance: number): bsv.Transaction {
        this.balance = initBalance
        const tx = new bsv.Transaction().from(utxos).addOutput(
            new bsv.Transaction.Output({
                script: this.lockingScript,
                satoshis: initBalance,
            })
        )
        this.lockTo = { tx, outputIndex: 0 }
        return tx
    }

    getMultisigTx(
        userSig: Sig,
        aymSig: Sig,
        winner: bsv.PublicKey,
        prevTx: bsv.Transaction
    ): bsv.Transaction {
        const inputIndex = 0
        return new bsv.Transaction()
            .addInputFromPrevTx(prevTx)
            .setInputScript(inputIndex, (tx) => {
                this.unlockFrom = { tx, inputIndex }
                return this.getUnlockingScript((self) => {
                    self.multisig(userSig, aymSig)
                })
            })
            .addOutput(
                new bsv.Transaction.Output({
                    script: bsv.Script.buildPublicKeyHashOut(winner),
                    satoshis: this.balance,
                })
            )
    }

    // Timelock
    getRefundTx(prevTx: bsv.Transaction): bsv.Transaction {
        const inputIndex = 0
        return new bsv.Transaction()
            .addInputFromPrevTx(prevTx)
            .setInputScript(inputIndex, (tx) => {
                this.unlockFrom = { tx, inputIndex }
                return this.getUnlockingScript((self) => {
                    self.timelock()
                })
            })
            .addOutput(
                new bsv.Transaction.Output({
                    script: bsv.Script.buildPublicKeyHashOut(this.owner),
                    satoshis: this.balance,
                })
            )
    }
}
