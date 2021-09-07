# Minimal example of sending a Megabundle to Flashbots

import json
import requests
import rlp
from rlp.sedes import CountableList, binary, big_endian_int
import eth_account
import web3
import random 

INFURA_ENDPOINT = 'http://localhost:1112/'
w3 = web3.Web3(web3.HTTPProvider(INFURA_ENDPOINT))

MEGABUNGLE_RPC = 'http://localhost:1112/'

INCLUSION_FEE = int(0.1337e18)

# This address is used both to create a fee-paying transaction and for trusted relay signature
ACCOUNT_ADDRESS = '0xfb11e78C4DaFec86237c2862441817701fdf197F'
ACCOUNT_PRIVKEY = '0ceb0619ccbb1092e3d0e3874e4582abe5f9518262e465575ca837a7dad0703d'



class UnsignedMegabundle(rlp.Serializable):
    fields = [
        ('txs', CountableList(binary)),
        ('blockNumber', big_endian_int),
        ('minTimestamp', big_endian_int),
        ('maxTimestamp', big_endian_int),
        ('revertingTxHashes', CountableList(binary)),
    ]

def send_request(megabundle, endpoint):
    payload = {
        'id': '123','jsonrpc': '2.0', 'method': 'eth_sendMegabundle', 'params': [megabundle]
    }
    response = requests.post(
        endpoint,
        data=json.dumps(payload),
        headers={
            'Content-Type': 'application/json'
        },
        timeout=10.0,
    ).json()
    return response
    # if response is not None and isinstance(response, dict) and 'result' in response:
    #     return response['result']
    # else:
    #     print(f'Looks like we got an error! Message {response}')
    #     return None


def sign_bribe_tx():
    nonce = w3.eth.get_transaction_count(ACCOUNT_ADDRESS)
    TRANSFER_GAS = 21000
    bribe_tx = w3.eth.account.sign_transaction(
        dict(chainId=888,nonce=nonce, gasPrice=INCLUSION_FEE // TRANSFER_GAS, gas=TRANSFER_GAS, to='0xfb05314AD5f12968Fa71C0c944aA376C5f3316D5',
             value=INCLUSION_FEE, data=b''),
        ACCOUNT_PRIVKEY)
    return bribe_tx.rawTransaction.hex()

def sign_tx(account_address, to_address, account_pk, value, gas_price, gas, data):
    nonce = w3.eth.get_transaction_count(account_address)
    bribe_tx = w3.eth.account.sign_transaction(
        dict(chainId=888,nonce=nonce, gasPrice=gas_price, gas=gas, to=to_address,
             value=value, data=data),
        account_pk)
    return bribe_tx.rawTransaction.hex()


# relay pk for signing mega bundle
def send_megabundle(megabundle, relay_pk):
    unsigned_megabundle = UnsignedMegabundle(
        txs=[bytes.fromhex(tx[2:]) for tx in megabundle['txs']],
        blockNumber=megabundle['blockNumber'],
        minTimestamp=0,
        maxTimestamp=0,
        revertingTxHashes=megabundle['revertingTxHashes'] if 'revertingTxHashes' in megabundle else [])
    rlp_encoding = rlp.encode(unsigned_megabundle)
    # print('rlp_encoding', rlp_encoding.hex())
    megabundle['relaySignature'] = web3.Account.sign_message(
        eth_account.messages.encode_defunct(primitive=rlp_encoding),
        private_key=relay_pk
    ).signature.hex()
    return send_request(megabundle, MEGABUNGLE_RPC)


zero_address = "0x0000000000000000000000000000000000000000"
briber_contract_address = "0x91BeEE865B16e09CC8D81201717D68C769985e00"

miner_coinbase_address = "0xfb05314AD5f12968Fa71C0c944aA376C5f3316D5"
miner_coinbase_pk = "21ba0523de424fad1e87f7549d455c360db90b481a4965a93556e81f6ed0e975"

main_relay_address = "0xfb11e78C4DaFec86237c2862441817701fdf197F"
main_relay_pk = "0ceb0619ccbb1092e3d0e3874e4582abe5f9518262e465575ca837a7dad0703d"

searcher_address = "0xfb2C208D463588C95D19526041B6E5a52d8521b7"
searcher_pk = "9da5b1bed544fbb84a5a98b3540c932645e007af300c28c2a197206ce9009fc4"

non_relay_address = "0xfb3b5cEF31281b4093C986326B41F229416f160A"
non_relay_pk = "540cc948018cc4ec1bb3b31eab8cfbb2d3557822b4a87f1dd1fbfbe67a4ae11d"

secondary_relay_address = "0xfb4DF6C0b652E483fF4ee922654222507A0A7df6"
secondary_relay_pk = "f78aa6e64de165f45db4d5ce18a9974a794f33f1debd074e57add0982b5b5b0f"

bribe_contract = ""
bribe_fn_input = "0x37d0208c"
yes_conditional_input = "0x8f2a84fd0000000000000000000000000000000000000000000000000000000000000001"
no_conditional_input = "0x8f2a84fd0000000000000000000000000000000000000000000000000000000000000000"
intentional_revert_input = "0x6448a3df"

# Doesn't process bundles from untrusted relays
def test_negative_one():
    print("**** Test - Negative case #1 ****")
    target_block = w3.eth.blockNumber + 10
    # sample tx bundle that sends 1 eth to miner (7 gwei gas price)
    tx = sign_tx(searcher_address, miner_coinbase_address, searcher_pk, 1 * 10 ** 18, 7 * 10 ** 18, 21000, b'')
    megabundle = {'txs': [tx], 'blockNumber': target_block}
    response = send_megabundle(megabundle, non_relay_pk)
    # Context "// TODO(bogatyy): ideally we want to return an error on non-trusted addresses. Instead, they will be ignored."
    # do we want an expicit error message?
    if(response['result'] is None):
        print("Passes")

# Errors if signature error from trusted relay
def test_negative_two():
    print("**** Test - Negative case #2 ****")
    target_block = w3.eth.blockNumber + 10
    # sample tx bundle that sends 1 eth to miner (7 gwei gas price)
    tx = sign_tx(searcher_address, miner_coinbase_address, searcher_pk, 1 * 10 ** 18, 7 * 10 ** 18, 21000, b'')
    megabundle = {'txs': [tx], 'blockNumber': target_block}
    # instead of sending bundle we create a faulty signature
    unsigned_megabundle = UnsignedMegabundle(
        txs=[bytes.fromhex(tx[2:]) for tx in megabundle['txs']],
        blockNumber=megabundle['blockNumber'],
        minTimestamp=0,
        maxTimestamp=0,
        revertingTxHashes=megabundle['revertingTxHashes'] if 'revertingTxHashes' in megabundle else [])
    rlp_encoding = rlp.encode(unsigned_megabundle)
    # print('rlp_encoding', rlp_encoding.hex())
    megabundle['relaySignature'] = web3.Account.sign_message(
        eth_account.messages.encode_defunct(primitive=rlp_encoding),
        private_key=main_relay_pk
    ).signature.hex() + '0xgibberish' #TODO: try diff cases with AB or 12
    response = send_request(megabundle, MEGABUNGLE_RPC)
    # check for sig error
    if(response['error']['code']== -32602 and response['error']['message']=='invalid argument 0: json: cannot unmarshal hex string of odd length into Go struct field SendMegabundleArgs.relaySignature of type hexutil.Bytes'):
        print("Passes")

# Payment conditional on block coinbase fails when expected
def test_negative_three():
    print("**** Test - Negative case #3 ****")
    target_block = w3.eth.blockNumber + 10
    # sample tx with conditional for block transfer
    tx = sign_tx(
        searcher_address, 
        bribe_contract, 
        searcher_pk, 
        1 * 10 ** 18, 7 * 10 ** 18, 21000, 
        yes_conditional_input
        )
    megabundle = {'txs': [tx], 'blockNumber': target_block}
    response = send_megabundle(megabundle, non_relay_pk)
    # check_mega_bundle_status(target_block)
    # if(response['result'] is None):
    #     print("Passes")
    

# Bundle that reverts is ignored
def test_negative_four():
    print("**** Test - Negative case #4 ****")
    target_block = w3.eth.blockNumber + 10
    # sample tx with conditional for block transfer
    tx = sign_tx(
        searcher_address, 
        bribe_contract, 
        searcher_pk, 
        1 * 10 ** 18, 7 * 10 ** 18, 21000, 
        intentional_revert_input
        )
    megabundle = {'txs': [tx], 'blockNumber': target_block}
    response = send_megabundle(megabundle, non_relay_pk)
    # check_mega_bundle_status(target_block)
    

# Doesn't process bundles with txs that use insufficient gas
def test_negative_five():
    print("**** Test - Negative case #5 ****")
    target_block = w3.eth.blockNumber + 10
    # sample tx bundle that sends 1 eth to miner (7 gwei gas price)
    # but insufficient gas 21k => 10k
    tx = sign_tx(searcher_address, miner_coinbase_address, searcher_pk, 1 * 10 ** 18, 7 * 10 ** 18, 10000, b'')
    megabundle = {'txs': [tx], 'blockNumber': target_block}
    response = send_megabundle(megabundle, non_relay_pk)
    # check_mega_bundle_status(target_block)

def get_random_megabundle_by_size(size, block):
    txs = []
    for n in range(size):
        target_block = block + 10
        # sample tx 
        tx = sign_tx(
            searcher_address, 
            bribe_contract, 
            searcher_pk, 
            random.uniform(0.5, 1) * 10 ** 18, # random bribe
            7 * 10 ** 18, 21000, 
            bribe_fn_input
            )
        txs.append(tx)
    megabundle = {'txs': txs, 'blockNumber': target_block}
    return megabundle

# Megabundle of various sizes, verify that they get mined and show up in top of bundle
def test_postive_one():
    print("**** Test - Positive case #1 ****")
    target_block = w3.eth.blockNumber + 10
    megabundle_a = get_random_megabundle_by_size(3, w3.eth.blockNumber)
    megabundle_b = get_random_megabundle_by_size(5, w3.eth.blockNumber)
    # send_megabundle(megabundle_a, main_relay_pk)
    
    # check_mega_bundle_status(target_block)
    

# TX fee payments (total profit computed correctly)
def test_postive_two():
    print("**** Test - Positive case #2 ****")
    target_block = w3.eth.blockNumber + 10
    # sample tx bundle that sends 1 eth to miner (7 gwei gas price)
    tx = sign_tx(searcher_address, zero_address, searcher_pk, 1 * 10 ** 18, 70 * 10 ** 18, 21000, b'')
    megabundle = {'txs': [tx], 'blockNumber': target_block}
    # response = send_megabundle(megabundle, main_relay_pk)
    # verify_fee_payment()


# Same as below from the same miner
def test_postive_seven():
    print("**** Test - Positive case #7 ****")
    target_block = w3.eth.blockNumber + 10
    # sample megabundles with 10 ETH bribe vs 3 ETH bribe
    tx_a = sign_tx(searcher_address, bribe_contract, searcher_pk, 10 * 10 ** 18, 7 * 10 ** 18, 50000, b'')
    megabundle_a = {'txs': [tx_a], 'blockNumber': target_block}
    # response = send_megabundle(megabundle, main_relay_pk)
    tx_b = sign_tx(searcher_address, bribe_contract, searcher_pk, 3 * 10 ** 18, 7 * 10 ** 18, 50000, b'')
    megabundle = {'txs': [tx_b], 'blockNumber': target_block}
    # response = send_megabundle(megabundle, main_relay_pk)

# Submit multiple megabundles from different relayers, verify most profitable one wins
def test_postive_eight():
    print("**** Test - Positive case #8 ****")
    target_block = w3.eth.blockNumber + 10
    # sample megabundles with 10 ETH bribe vs 3 ETH bribe
    tx_a = sign_tx(searcher_address, bribe_contract, searcher_pk, 10 * 10 ** 18, 7 * 10 ** 18, 50000, b'')
    megabundle_a = {'txs': [tx_a], 'blockNumber': target_block}
    # response = send_megabundle(megabundle, main_relay_pk)
    tx_b = sign_tx(searcher_address, bribe_contract, searcher_pk, 3 * 10 ** 18, 7 * 10 ** 18, 50000, b'')
    megabundle = {'txs': [tx_b], 'blockNumber': target_block}
    # response = send_megabundle(megabundle, secondary_relay_pk)
    # make sure only the former gets mined
    # verify_competing_relays(target_block)

# Left as TODO since mega bundles are processed
# should lookout for new block subsriptions for tx inclusion 
def check_mega_bundle_status(block):
    pass


if __name__ == '__main__':
    # test_negative_one()
    # test_negative_two()
    # test_negative_three()
    # test_negative_four()
    # test_negative_five()
    # test_postive_one()
    # test_postive_two()
    # test_postive_three()
    # test_postive_four()
    # test_postive_five()
    # test_postive_six()
    # test_postive_seven()
    # test_postive_eight()