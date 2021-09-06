const { ethers } = require("ethers");
const {getSignedBundle} = require('./rlpHelper')
const nodeRPC = "http://localhost:1112/"
const ethersProvider = new ethers.providers.JsonRpcProvider(nodeRPC);
const {signEIP1559Tx} = require('../1559-helpers')
const Web3 = require('web3');
const web3Client = new Web3(new Web3.providers.HttpProvider(nodeRPC))
const fetch = require('node-fetch')
// private keys
const searcherAddr = "0xfb2C208D463588C95D19526041B6E5a52d8521b7"
const searcherPk = "9da5b1bed544fbb84a5a98b3540c932645e007af300c28c2a197206ce9009fc4"
const searcherWallet = new ethers.Wallet(searcherPk, ethersProvider)

const zeroAddr = "0x0000000000000000000000000000000000000000"

const briber = "0x91BeEE865B16e09CC8D81201717D68C769985e00"


const relay = "0xfb11e78C4DaFec86237c2862441817701fdf197F"
const relaypk = "0ceb0619ccbb1092e3d0e3874e4582abe5f9518262e465575ca837a7dad0703d"
const getLatestBaseFee = async() => {
    // const block = await web3Client.eth.getBlock("latest")
    const block = await ethersProvider.getBlock("latest")
    return parseInt(block.baseFeePerGas.toString())
}

const submitBundle = async (baseFee, priorityFee) => {
    const nonce = await searcherWallet.getTransactionCount()
    const sample1559TxInput = {
        to: zeroAddr,
        value: 999 * 10 ** 18, // 1 ETH,
        fromAddress: searcherAddr,
        data: "0x",
        gasLimit: 21000,
        priorityFee,
        baseFee,
        privateKey: searcherPk,
        nonce
    }
    const sampleBribeTx = {
        to: '0xfb05314AD5f12968Fa71C0c944aA376C5f3316D5', // miner
        value: 9.9 * 10 ** 18, // 2 ETH
        fromAddress: searcherAddr,
        data:"0x",
        // data: "0x37d0208c", // bribe()
        gasLimit: 21000,
        priorityFee,
        baseFee,
        privateKey: searcherPk,
        nonce: nonce + 1
    }
    const signedMainTX = await signEIP1559Tx(sample1559TxInput, web3Client)
    const signedBribeTx = await signEIP1559Tx(sampleBribeTx, web3Client)
    // const res = await ethersProvider.sendTransaction(signedBribeTx)
    // console.log(res)
    const txs = [signedMainTX, signedBribeTx]
    console.log(ethers.utils.keccak256(txs[0]), ethers.utils.keccak256(txs[1]))
    const blk = await ethersProvider.getBlockNumber()
    // console.log(txs, blk)
    console.log(blk + 10)
    // console.log(await )
    // const sig = {
    //   txs,
    //   blockNumber: blk + 10,
    //   minTimestamp: 0,
    //   maxTimestamp: 0,
    //   revertingTxHashes: []
    // }
    // const rlpEncoded = ethers.utils.RLP.encode(sig)
    // console.log(rlpEncoded)
    // console.log(sample1559TxInput, sampleBribeTx)
    const signature = await getSignedBundle(txs, blk + 10, 0, 0, [], relaypk)
    const params = [
        {
          txs,
          blockNumber: blk + 10,
          minTimestamp: 0,
          maxTimestamp: 0,
          revertingTxHashes: [],
          relaySignature: signature
        }
      ]
      const body = {
        params,
        method: 'eth_sendMegabundle',
        id: '1'
      }
      console.log(JSON.stringify(body))
      const respRaw = await fetch('http://localhost:1112', {
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
      console.log(json)

    // return [signedMainTX, signedBribeTx]
    // console.log(blk)
    // for (let i = 1; i <= 10; i++) {
    //     var transactionBundle = [
    //         {
    //           signedTransaction: signedMainTX
    //         },
    //         {
    //           signedTransaction: signedBribeTx
    //         }
    //     ]
    //     console.log('bundle', i)
    //     console.log(transactionBundle, blk + i)
    //     await sleep(300)
    //     const flashbotsTransactionResponse = await flashbotsProvider.sendBundle(
    //         transactionBundle,
    //         blockNumber + i,
    //     )
    //     console.log(`Sent bundle for block #${blockNumber + 10}, res: `, flashbotsTransactionResponse )
    //     // log response and other date here
    //     db.get('bundles').push({
    //         id: db.get('count').value(),
    //         type: 'legacy',
    //         bribeTxHash: '1',
    //         res: flashbotsTransactionResponse,
    //         targetBlock: blockNumber + i,
    //         bribeTxHash: web3Client.utils.keccak256(signedTxs[1]),
    //         mainTxHash: web3Client.utils.keccak256(signedTxs[0])
    //     }).write()
    //     db.update('count', n => n + 1).write()
    // }

}


// ethersProvider.on("block", async(block) => {
//     const blk = await ethersProvider.getBlock(block);
//     console.log("block#", block);
//     console.log(blk)
// })


const main = async() => {
    // console.log(await ethersProvider.getTransactionReceipt('0xa609852014e5a7671f6a84f8bfca369a38e83f918fc7ed685fed52269fb51e21'))
  console.log((await ethersProvider.getBalance(zeroAddr)).toString())
//   console.log((await ethersProvider.getBalance('0xfb05314AD5f12968Fa71C0c944aA376C5f3316D5', 158)).toString())

    // await submitBundle(await getLatestBaseFee(), 5000000000) // 5 gwei
}

setTimeout(main, 1000)