# Minimal example of sending a Megabundle to Flashbots

import json
import os
import requests
import rlp
from rlp.sedes import CountableList, binary, big_endian_int
import time

import eth_account
import web3

# MiningDAO public example endpoint, please don't abuse
INFURA_ENDPOINT = 'http://localhost:1112/'
w3 = web3.Web3(web3.HTTPProvider(INFURA_ENDPOINT))

MEGABUNGLE_RPC = 'http://localhost:1112/'

INCLUSION_FEE = int(0.1337e18)

# This address is used both to create a fee-paying transaction and for trusted relay signature
ACCOUNT_ADDRESS = '0xfb11e78C4DaFec86237c2862441817701fdf197F'
ACCOUNT_PRIVKEY = '0ceb0619ccbb1092e3d0e3874e4582abe5f9518262e465575ca837a7dad0703d'
MINER_ADDRESS = '0xfb05314AD5f12968Fa71C0c944aA376C5f3316D5'
ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

def send_request(endpoint, payload, headers):
    response = requests.post(
        endpoint,
        data=json.dumps(payload),
        headers=headers,
        timeout=10.0,
    ).json()
    print(response)
    if response is not None and isinstance(response, dict) and 'result' in response:
        return response['result']
    else:
        print(f'Looks like we got an error! Message {response}')
        return None


def sign_bribe_tx():
    nonce = w3.eth.get_transaction_count(ACCOUNT_ADDRESS)
    TRANSFER_GAS = 21000
    bribe_tx = w3.eth.account.sign_transaction(
        dict(chainId=888, nonce=nonce, gasPrice=INCLUSION_FEE // TRANSFER_GAS, gas=TRANSFER_GAS, to=MINER_ADDRESS,
             value=INCLUSION_FEE, data=b''),
        ACCOUNT_PRIVKEY)
    return bribe_tx.rawTransaction.hex()


class UnsignedMegabundle(rlp.Serializable):
    fields = [
        ('txs', CountableList(binary)),
        ('blockNumber', big_endian_int),
        ('minTimestamp', big_endian_int),
        ('maxTimestamp', big_endian_int),
        ('revertingTxHashes', CountableList(binary)),
    ]


def send_megabundle(megabundle):
    print("targetting block: ", megabundle['blockNumber'])
    unsigned_megabundle = UnsignedMegabundle(
        txs=[bytes.fromhex(tx[2:]) for tx in megabundle['txs']],
        blockNumber=megabundle['blockNumber'],
        minTimestamp=megabundle['minTimestamp'] if 'minTimestamp' in megabundle else 0,
        maxTimestamp=megabundle['maxTimestamp'] if 'maxTimestamp' in megabundle else 0,
        revertingTxHashes=megabundle['revertingTxHashes'] if 'revertingTxHashes' in megabundle else [])
    rlp_encoding = rlp.encode(unsigned_megabundle)
    print('rlp_encoding', rlp_encoding.hex())
    megabundle['relaySignature'] = web3.Account.sign_message(
        eth_account.messages.encode_defunct(primitive=rlp_encoding),
        private_key=ACCOUNT_PRIVKEY
    ).signature.hex()
    print('relay signature', megabundle['relaySignature'])
    headers = {'Content-Type': 'application/json'}
    payload = {'id': '123', 'jsonrpc': '2.0', 'method': 'eth_sendMegabundle', 'params': [megabundle]}
    return send_request(MEGABUNGLE_RPC, payload, headers)


def check_status(tx_hash):
    block = w3.eth.get_transaction(tx_hash)
    blockNo = block['blockNumber']
    balance_before = w3.eth.get_balance(MINER_ADDRESS, blockNo-1)
    balance_after = w3.eth.get_balance(MINER_ADDRESS, blockNo)
    print(balance_after-balance_before)

if __name__ == '__main__':
    balance = w3.eth.getBalance(ACCOUNT_ADDRESS)
    assert balance > 1.1 * INCLUSION_FEE, 'Not enough money on account, cannot pay for bundles'

    tx = sign_bribe_tx()
    print('Sending this TX as a Megabundle', tx)
    megabundle = {'txs': [tx], 'blockNumber': w3.eth.blockNumber + 5, 'minTimestamp': 0, 'maxTimestamp': 0}
    send_megabundle(megabundle)
    # print(tx)
    # tx_hash = w3.eth.send_raw_transaction(tx)
    # print(tx_hash.hex())
    # check_status('0xfc62e75cdac2a7d33c4e5ec9dcbc0a805ae1e44b6287ea76fbbf6475f04f0e4c')

