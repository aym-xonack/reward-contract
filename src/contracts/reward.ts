import {
    method,
    prop,
    SmartContract,
    hash256,
    assert,
    bsv,
    UTXO,
    Sig
} from 'scrypt-ts'

export class Reward extends SmartContract {

    @prop()
    owner: PubKey;

    @prop()
    aym: PubKey;

    @prop()
    deadline: bigint;  //UNIX time

    @prop()
    abandoned: bigint;  //UNIX time

    constructor(owner: PubKey, aym: PubKey, deadline: bigint) {
        super(owner, aym, deadline)

        this.owner = owner;
        this.aym = aym;
        this.deadline = deadline; //UNIX time
        this.abandonded = deadline + 86400;
    }

    @method()
    public multisig(userSig: Sig, aymSig: Sig){
        assert(this.checkSig(userSig, this.owner), 'wrong signiture for bounty owner.')
        assert(this.checkSig(), 'wrong Aym signature')
    }

    @method()
    public timelock() {
        assert(
            this.ctx.locktime >= this.abandoned,
            'wait 24H after auction deadline to claim as abandoned.'
        )
    }

}