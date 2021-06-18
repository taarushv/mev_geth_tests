const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const Common = require('@ethereumjs/common').default
const ethTx = require('@ethereumjs/tx');

const localRPC = "http://localhost:8545/"
const client = new Web3(new Web3.providers.HttpProvider(localRPC))
const privateKey = "133be114715e5fe528a1b8adf36792160601a2d63ab59d1fd454275b31328791"
const address = "0xd912AeCb07E9F4e1eA8E6b4779e7Fb6Aa1c3e4D8"
const chainID = 888
const signEIP1559Tx = async (input) => {
    const nonce = await client.eth.getTransactionCount(address);
    const feeCap = input.feeCap ?? new BigNumber(await client.eth.getGasPrice()).times(2).toFixed();
    const fullInput = {
        to: input.to,
        data: input.data ?? '0x',
        value: Web3.utils.toHex(input.value ?? '0'),
        nonce: Web3.utils.toHex(nonce),
        gasLimit: Web3.utils.toHex(input.gasLimit ?? '21000'),
        maxFeePerGas: Web3.utils.toHex(feeCap),
        maxPriorityFeePerGas: Web3.utils.toHex(input.tip ?? '0'),
        chainId: Web3.utils.toHex(await client.eth.getChainId()),
        accessList: [],
        type: "0x02"
    }
    const customCommon = Common.forCustomChain(
        'mainnet',
        {
            name: 'mev-geth-with-1559',
            chainId: chainID,
        },
        'london',
    );
    const unsignedTx = new ethTx.FeeMarketEIP1559Transaction(fullInput, {customCommon});
    //const signedTx = unsignedTx.sign(Buffer.from(privateKey, 'hex'));
    const signedTx = unsignedTx.sign(Buffer.from(privateKey, 'hex'))
    return '0x' + signedTx.serialize().toString('hex');
}

const input = {
    to: '0x0000000000000000000000000000000000000000',
    value: 1 * 10 ** 18, // 1 ETH
}

const getTxStatus = (hash) => {

}
const main = async() => {
    const hash = "0x4fe76df808b822fac4c14422fee5ad1559e1a896fc3ad81b17c1c0dc8fc0ba83"
    client.eth.getTransactionReceipt(hash).then(console.log);
    client.eth.getTransaction(hash).then(console.log);
    //const txSignature = (await signEIP1559Tx(input))
    //client.eth.sendSignedTransaction(txSignature);
    //console.log(await client.eth.getGasPrice())
}

main()