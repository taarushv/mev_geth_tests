const Web3 = require('web3');
const BigNumber = require('bignumber.js');

// to sign and send txs
const Common = require('@ethereumjs/common').default
const ethTx = require('@ethereumjs/tx');

const localRPC = "http://localhost:8545/"

// an array of RPCs (docker container's 8545 port of each instance binded to the following)
const localRPCs = ["http://localhost:1112"]
const randomRPC =  Math.floor(Math.random() * localRPCs.length);

const client = new Web3(new Web3.providers.HttpProvider(localRPCs[randomRPC]))
const privateKey = "133be114715e5fe528a1b8adf36792160601a2d63ab59d1fd454275b31328791"
const address = "0xd912AeCb07E9F4e1eA8E6b4779e7Fb6Aa1c3e4D8"
const chainID = 888 // chain id of geth cluster inside docker, for consistency 

// test tx data
// for now, simple transfers to burn address to see how the basefee changes over time
const input = {
    to: '0x0000000000000000000000000000000000000000',
    value: 1 * 10 ** 18, // 1 ETH
}

// helper function to return signed tx, in EIP1559 0x02 format
const signEIP1559Tx = async (input) => {
    const accountNonce = await client.eth.getTransactionCount(address);
    const feeCap = new BigNumber(await client.eth.getGasPrice()).times(2).toFixed(); // until baseFeePerGas is exposed via RPC (block header, `eth.getHeaderByNumber("0x0")`)
    const tx = {
        to: input.to,
        data: '0x',
        value: Web3.utils.toHex(input.value),
        nonce: Web3.utils.toHex(accountNonce),
        gasLimit: Web3.utils.toHex('21000'),
        maxFeePerGas: Web3.utils.toHex(feeCap),
        maxPriorityFeePerGas: Web3.utils.toHex('0'), // 0 tip for now
        chainId: Web3.utils.toHex(await client.eth.getChainId()),
        accessList: [],
        type: "0x02" // ensures the tx isn't legacy type
    }
    // custom common for our private network
    const customCommon = Common.forCustomChain(
        'mainnet',
        {
            name: 'mev-geth-with-1559',
            chainId: chainID,
        },
        'london',
    );
    // sign and return
    const unsignedTx = new ethTx.FeeMarketEIP1559Transaction(tx, {customCommon});
    const signedTx = unsignedTx.sign(Buffer.from(privateKey, 'hex'))
    return '0x' + signedTx.serialize().toString('hex');
}

const getTxStatus = async (hash) => {
    const txReceipt = await client.eth.getTransactionReceipt(hash)
    const txInfo = await client.eth.getTransaction(hash).then(console.log);
    return {
        txReceipt, 
        txInfo
    }
}
// simple test to ensure the tx is propagaged to all the peers in the private net
// eventually our existing mev-geth-demo + bundle flow controller will be ported here
const main = async() => {
    console.log("Propagting tx to node: "+ localRPCs[randomRPC])
    const txSignature = (await signEIP1559Tx(input))
    client.eth.sendSignedTransaction(txSignature);
}

main()


/**
 * import { ethers, Wallet } from 'ethers'
import fetch from 'node-fetch'

const FAUCET = '0x133be114715e5fe528a1b8adf36792160601a2d63ab59d1fd454275b31328791'
const DUMMY_RECEIVER = '0x1111111111111111111111111111111111111111'
// connect to the simple provider
let provider = new ethers.providers.JsonRpcProvider('http://localhost:8545')
// we use the miner as a faucet for testing
const faucet = new ethers.Wallet(FAUCET, provider)
// we create a random user who will submit bundles
const user = ethers.Wallet.createRandom().connect(provider)

;(async () => {
  // wrap it with the mev-geth provider
  const authSigner = Wallet.createRandom()

  console.log('Faucet', faucet.address)
  // fund the user with some Ether from the coinbase address
  console.log('Funding account...this may take a while due to DAG generation in the PoW testnet')
  let tx = await faucet.sendTransaction({
    to: user.address,
    value: ethers.utils.parseEther('1')
  })
  await tx.wait()
  console.log('OK')
  const balance = await provider.getBalance(user.address)
  console.log('Balance:', balance.toString())

  const nonce = await user.getTransactionCount()
  const bribe = ethers.utils.parseEther('0.06666666666')
  const txs = [
    // some transaction
    await user.signTransaction({
      to: DUMMY_RECEIVER,
      value: ethers.utils.parseEther('0.1'),
      nonce: nonce
    }),
    // the miner bribe
    await user.signTransaction({
      to: faucet.address,
      value: bribe,
      nonce: nonce + 1
    })
  ]

  console.log('Submitting bundle')
  const blk = await provider.getBlockNumber()

  for (let i = 1; i <= 10; i++) {
    const params = [
      {
        txs,
        blockNumber: `0x${(blk + i).toString(16)}`
      }
    ]
    const body = {
      params,
      method: 'eth_sendBundle',
      id: '123'
    }
    const respRaw = await fetch('http://localhost:8545', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    if (respRaw.status >= 300) {
      console.error('error sending bundle')
      process.exit(1)
    }
    const json = await respRaw.json()
    if (json.error) {
      console.error('error sending bundle, error was', json.error)
      process.exit(1)
    }
  }
  while (true) {
    const newBlock = await provider.getBlockNumber()
    if (newBlock > blk + 10) break
    await new Promise((resolve) => setTimeout(resolve, 100)) // sleep
  }

  const balanceBefore = await provider.getBalance(faucet.address, blk)
  const balanceAfter = await provider.getBalance(faucet.address, blk + 10)
  console.log('Miner before', balanceBefore.toString())
  console.log('Miner after', balanceAfter.toString())
  // subtract 2 for block reward
  const profit = balanceAfter.sub(balanceBefore).sub(ethers.utils.parseEther('2'))
  console.log('Profit (ETH)', ethers.utils.formatEther(profit))
  console.log('Profit equals bribe?', profit.eq(bribe))
})().catch((err) => {
  console.error('error encountered in main loop', err)
  process.exit(1)
})
 */