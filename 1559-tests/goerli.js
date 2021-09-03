
const { ethers } = require("ethers");
const {signEIP1559Tx} = require('../1559-helpers')

const Web3 = require('web3');
const web3Client = new Web3(new Web3.providers.HttpProvider("https://rpc.goerli.mudit.blog/"))

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const db = low(adapter)

db.defaults({ bundles: [], count: 0 })
  .write()

const FlashbotsBundleProvider = require("@flashbots/ethers-provider-bundle").FlashbotsBundleProvider
const ethersProvider = ethers.getDefaultProvider("goerli");

const TEST_PK = "0xc75f361a52bb1725fb6f8e927d78860223b232d9139eb5eedad5860cb2f4f2ab"
const TEST_ADDR = "0xc0E63d899D44C2F5C3F4169d737E622DF6C66d9f"
const testWallet = new ethers.Wallet(TEST_PK, ethersProvider)

const FAUCET_PK = '0x133be114715e5fe528a1b8adf36792160601a2d63ab59d1fd454275b31328791'
const FAUCET_ADDR = "0xd912AeCb07E9F4e1eA8E6b4779e7Fb6Aa1c3e4D8"
const faucet = new ethers.Wallet(FAUCET_PK, ethersProvider)

const BRIBE_CONTRACT_ADDR = "0x6476224F6395a9804F8b4B6685d99C0f435C683a" //Bribe.sol on goerli

const testCases = ["legacyTxBundle", "accurateBaseFee", "accurateBaseFeeWithPriorityFee", "underpricedBaseFee"]
// TODO: legacy tx^, next 10 blocks
// const baseFee = 1000000000 // 1 gwei, 1559 fork starts with this basefee

const MINER_BRIBE = ethers.utils.parseEther('0.05')

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const getBaseFee = async() => {
    // const infuraRPC = "https://www.ethercluster.com/goerli"
    const RPC = "http://localhost:1112"
    const goerliClient = new Web3(new Web3.providers.HttpProvider(RPC))
    const block = await goerliClient.eth.getBlock("latest")
    return parseInt(block.baseFeePerGas)
}

const getRequiredRandomInt = (max) => {
    var rand = Math.floor(Math.random() * max);
    if(rand!==0 && rand!==1){ // to avoid division by 0 or not underpricing (division by 1)
        return rand
    }else{
        return 2
    }
}

const submitLegacyBundle = async () => {
    const nonce = await testWallet.getTransactionCount()
    console.log(nonce)
    const signedTxs = [
      // some transaction
      await testWallet.signTransaction({
        to: "0x0000000000000000000000000000000000000000",
        value: ethers.utils.parseEther('0.0001'),
        nonce: nonce
      }),
      // the miner bribe
      await testWallet.signTransaction({
        to: BRIBE_CONTRACT_ADDR,
        value: MINER_BRIBE,
        nonce: nonce + 1,
        data: "0x37d0208c", // bribe()
        gasLimit: 50000
      })
    ]
    const blk = await ethersProvider.getBlockNumber()
    for (let i = 1; i <= 10; i++) {
        var transactionBundle = [
            {
              signedTransaction: signedTxs[0]
            },
            {
              signedTransaction: signedTxs[1]
            }
        ]
        console.log('bundle', i)
        console.log(transactionBundle, blk + i)
        await sleep(300)
        const flashbotsTransactionResponse = await flashbotsProvider.sendBundle(
            transactionBundle,
            blockNumber + i,
        )
        console.log(`Sent bundle for block #${blockNumber + i}, res: `, flashbotsTransactionResponse )
        // log response and other date here
        db.get('bundles').push({
            id: db.get('count').value(),
            type: 'legacy',
            bribeTxHash: '1',
            res: flashbotsTransactionResponse,
            targetBlock: blockNumber + i,
            bribeTxHash: web3Client.utils.keccak256(signedTxs[1]),
            mainTxHash: web3Client.utils.keccak256(signedTxs[0])
        }).write()
        db.update('count', n => n + 1).write()
    }
}

const submitBundle = async (baseFee, priorityFee, type) => {
    const nonce = await testWallet.getTransactionCount()
    const sample1559TxInput = {
        to: '0x0000000000000000000000000000000000000000',
        value: 0.0001 * 10 ** 18, // ETH,
        fromAddress: TEST_ADDR,
        data: "0x",
        gasLimit: 21000,
        priorityFee,
        baseFee,
        privateKey: TEST_PK.substring(2),
        nonce
    }
    const sampleBribeTx = {
        to: BRIBE_CONTRACT_ADDR,
        value: 0.05 * 10 ** 18,
        fromAddress: TEST_ADDR,
        data: "0x37d0208c", // bribe()
        gasLimit: 50000,
        priorityFee,
        baseFee,
        privateKey: TEST_PK.substring(2),
        nonce: nonce + 1
    }
    const signedMainTX = await signEIP1559Tx(sample1559TxInput, web3Client)
    const signedBribeTx = await signEIP1559Tx(sampleBribeTx, web3Client)
    const blk = await ethersProvider.getBlockNumber()
    console.log(blk)
    for (let i = 1; i <= 10; i++) {
        var transactionBundle = [
            {
              signedTransaction: signedMainTX
            },
            {
              signedTransaction: signedBribeTx
            }
        ]
        console.log('bundle', i)
        console.log(transactionBundle, blk + i)
        await sleep(300)
        const flashbotsTransactionResponse = await flashbotsProvider.sendBundle(
            transactionBundle,
            blockNumber + i,
        )
        console.log(`Sent bundle for block #${blockNumber + 10}, res: `, flashbotsTransactionResponse )
        // log response and other date here
        db.get('bundles').push({
            id: db.get('count').value(),
            type: 'legacy',
            bribeTxHash: '1',
            res: flashbotsTransactionResponse,
            targetBlock: blockNumber + i,
            bribeTxHash: web3Client.utils.keccak256(signedTxs[1]),
            mainTxHash: web3Client.utils.keccak256(signedTxs[0])
        }).write()
        db.update('count', n => n + 1).write()
    }

}

const main = async() => {
    const flashbotsProvider = await FlashbotsBundleProvider.create(
        ethersProvider,
        testWallet,
        "https://relay-goerli.flashbots.net",
        "goerli"
    );
    ethersProvider.on("block", async (blockNumber) => {
        const currentTestCase = testCases[Math.floor(Math.random() * testCases.length)]
        console.log(blockNumber)
        console.log(currentTestCase)
        var baseFee = await getBaseFee()
        switch (currentTestCase) {
            case "legacyTxBundle":
                await submitLegacyBundle()
                break;
            case "accurateBaseFee":
                console.log("Accurate base fee scenario: ")
                await submitBundle(baseFee, 0, "accurateBaseFee")
                break;
            case "accurateBaseFeeWithPriorityFee":
                console.log("Accurate base fee with priority scenario: ")
                await submitBundle(baseFee, getRequiredRandomInt(5) * 1000000000, "accurateBaseFeeWithPriorityFee")
                break;
            case "underpricedBaseFee":
                console.log("Underpriced base fee scenario: ")
                const newBaseFee = Math.floor((baseFee)/(getRequiredRandomInt(5)))
                console.log("underpricing base fee n: ", newBaseFee)
                await submitBundle(newBaseFee, getRequiredRandomInt(5) * 1000000000, "underpricedBaseFee")
                break;
            default:
                break;
        }
    })
}


//main()