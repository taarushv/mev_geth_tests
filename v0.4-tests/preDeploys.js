const { ethers, ContractFactory } = require("ethers");
const solc = require('solc')

const nodeRPC = "http://localhost:1112/"
const ethersProvider = new ethers.providers.JsonRpcProvider(nodeRPC);

const CONTRACT = `
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.0;
contract Bribe {
    function bribe() payable public {
        block.coinbase.transfer(msg.value);
    }
    function intentionalRevert public {
        revert();
    }
}
`

const INPUT = {
    language: 'Solidity',
    sources: {
      'Bribe.sol': {
        content: CONTRACT
      }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['*']
        }
      }
    }
}


const OUTPUT = JSON.parse(solc.compile(JSON.stringify(INPUT)))
const COMPILED = OUTPUT.contracts['Bribe.sol']
const ABI = COMPILED.Bribe.abi
const bytecode = '0x' + COMPILED.Bribe.evm.bytecode.object


// private keys
const miner = "0xfb05314AD5f12968Fa71C0c944aA376C5f3316D5"
const minerPk = "21ba0523de424fad1e87f7549d455c360db90b481a4965a93556e81f6ed0e975"
const txHash = "0x426dc4b6d298554ec3ecca2bcb7ebc1523978dda35b5cc3e5a6c0b6f56742033"
const zeroAddr = "0x0000000000000000000000000000000000000000"

const briberAddr = "0x91BeEE865B16e09CC8D81201717D68C769985e00"

const getLatestBaseFee = async() => {
    // const block = await web3Client.eth.getBlock("latest")
    const block = await ethersProvider.getBlock("latest")
    return parseInt(block.baseFeePerGas.toString())
}

const deployContract = async() => {
    //console.log(BIN)
    //console.log(await user.getFeeData())
    const baseFeePerGas = await getLatestBaseFee()
    const maxPriorityFeePerGas = 0
    const maxFeePerGas = maxPriorityFeePerGas + baseFeePerGas // anything extra is refunded anyway
    const deployContractTx = {
        value: 0,
        from: miner,
        data: bytecode,
        gasLimit: 200000,
        maxFeePerGas,
        maxPriorityFeePerGas
    }
    const minerWallet = new ethers.Wallet(minerPk, ethersProvider)
    const deployTxSend = await minerWallet.sendTransaction(deployContractTx)
    console.log('TX hash: ' + deployTxSend.hash)
    const receipt = await deployTxSend.wait()
    console.log(receipt)
    // const testHash = "0xffc8a107ecf4ef27ad912d1a1659f206bb33404fe781daef3355704f720332ae"
    // console.log(await ethersProvider.getTransaction(testHash))
}



// ethersProvider.on("block", async(block) => {
//     const blk = await ethersProvider.getBlock(block);
//     console.log("block#", block);
//     console.log(blk)
// })


const main = async() => {
    deployContract()

    // const tx = await ethersProvider.getTransaction(txHash)
    // console.log(tx)
    // const receipt = await ethersProvider.getTransactionReceipt(txHash)
    // console.log(receipt)
}

main()