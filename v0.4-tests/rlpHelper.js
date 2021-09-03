const axios = require('axios')

pyHelper = "http://localhost:5000/get-rlp-signature"

const getSignedBundle = async (txs, blockNumber, minTimestamp, maxTimestamp, revertingTxHashes, pk) => {
    txs = txs.join()
    if(revertingTxHashes == []){
        revertingTxHashes = ''
    }else {
        revertingTxHashes = revertingTxHashes.join()
    }
    const res = await axios.get(pyHelper, {
        params: {
            txs: txs,
            blockNumber: blockNumber,
            minTimestamp: minTimestamp,
            maxTimestamp: maxTimestamp,
            revertingTxHashes: revertingTxHashes,
            pk: pk
        }
    })
    return (res.data)
}

// const main = async() => {
//     const res = await getSignedBundle(['0xa122','0xa124'], 5, 0, 0, [],'0ceb0619ccbb1092e3d0e3874e4582abe5f9518262e465575ca837a7dad0703d')
//     console.log(res)
// }

// main()

exports.getSignedBundle = getSignedBundle