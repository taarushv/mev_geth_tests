import rlp
from rlp.sedes import CountableList, binary, big_endian_int
import eth_account
import web3
from flask import Flask, request

app = Flask(__name__)


class UnsignedMegabundle(rlp.Serializable):
    fields = [
        ('txs', CountableList(binary)),
        ('blockNumber', big_endian_int),
        ('minTimestamp', big_endian_int),
        ('maxTimestamp', big_endian_int),
        ('revertingTxHashes', CountableList(binary)),
    ]


@app.route('/get-rlp-signature')
def hello():
    txs = request.args.getlist('txs')
    formatted_txs = (txs[0]).split(',')
    reverting_tx_hashes = request.args.getlist('revertingTxHashes')
    formatted_reverting_tx_hashes = (reverting_tx_hashes[0]).split(',')
    formatted_reverting_tx_hashes = [] if formatted_reverting_tx_hashes == [''] else formatted_reverting_tx_hashes
    print(formatted_reverting_tx_hashes)
    block_number = int(request.args['blockNumber'])
    min_timestamp = int(request.args['minTimestamp'])
    max_timestamp = int(request.args['maxTimestamp'])
    private_key = request.args['pk']
    unsigned_megabundle = UnsignedMegabundle(
        txs=[bytes.fromhex(tx[2:]) for tx in formatted_txs],
        blockNumber=block_number,
        minTimestamp=min_timestamp,
        maxTimestamp=max_timestamp,
        revertingTxHashes=[bytes.fromhex(tx[2:]) for tx in formatted_reverting_tx_hashes])
    rlp_encoding = rlp.encode(unsigned_megabundle)
    signature = web3.Account.sign_message(
        eth_account.messages.encode_defunct(primitive=rlp_encoding),
        private_key=private_key
    ).signature.hex()
    print(formatted_txs, formatted_reverting_tx_hashes, block_number, min_timestamp, max_timestamp, private_key)
    print(signature)
    return signature