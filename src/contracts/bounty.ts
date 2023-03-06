import {
    method,
    prop,
    checkMultiSig,
    SmartContract,
    PubKey,
    assert,
    Sig,
    FixedArray,
} from 'scrypt-ts'

export class Bounty extends SmartContract {
    @prop()
    baron: PubKey

    @prop()
    aym: PubKey

    @prop()
    lockUntil: bigint //UNIX time

    constructor(aym: PubKey, owner: PubKey, lockUntil: bigint) {
        super(...arguments)

        this.aym = aym
        this.baron = owner
        this.lockUntil = lockUntil
    }

    @method()
    public select(sigs: FixedArray<Sig, 2>) {
        const pubkeys: FixedArray<PubKey, 2> = [this.aym, this.baron]
        assert(checkMultiSig(sigs, pubkeys))
    }

    @method()
    public abandon(sig: Sig) {
        assert(
            this.ctx.locktime >= this.lockUntil,
            'wait 24H after auction deadline to claim as abandoned.'
        )
        assert(this.checkSig(sig, this.baron), 'signature check failed')
    }
}
