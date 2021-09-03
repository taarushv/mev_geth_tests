### Notes (v0.4 testing)

#### Mega bundle PR: https://github.com/flashbots/mev-geth/tree/ivan-megabundles

1 node, 1 relay server, 2x keys



TODO: 

re: https://github.com/flashbots/mev-geth/issues/52

- [ ] Negative: Doesn't process bundles from untrusted relays
- [ ] Negative: Errors if signature error from trusted relay
- [ ] Negative: Payment conditional on block coinbase fails when expected
- [ ] Negative: Bundle that reverts is ignored
- [ ] Negative: Doesn't process bundles with revert txs
- [ ] Negative: Doesn't process bundles with txs that use insufficient gas

------
- [ ] Positive: Megabundle of various sizes, verify that they get mined and show up in top of bundle
- [ ] Positive: TX fee payments (total profit computed correctly)
- [ ] Positive: coinbase transfer fee payments (total profit computed correctly)
- [ ] Positive: TX fee & coinbase transfer fee payments (total profit computed correctly)
- [ ] Positive: Payment conditional on block coinbase succeeds when expected
- [ ] Positive: Bundle with specified reverting txn is successfully mined
- [ ] Positive: Miner selects the most profitable of N bundles or 1 megabundle, testing post sides.
- [ ] Positive: Submit multiple megabundles from different relayers, verify most profitable one wins


Keys: 

# miner

0xfb05314AD5f12968Fa71C0c944aA376C5f3316D5 
21ba0523de424fad1e87f7549d455c360db90b481a4965a93556e81f6ed0e975

# test accounts 

## relay
0xfb11e78C4DaFec86237c2862441817701fdf197F
0ceb0619ccbb1092e3d0e3874e4582abe5f9518262e465575ca837a7dad0703d


# searcher
0xfb2C208D463588C95D19526041B6E5a52d8521b7
9da5b1bed544fbb84a5a98b3540c932645e007af300c28c2a197206ce9009fc4


# non relay
0xfb3b5cEF31281b4093C986326B41F229416f160A
540cc948018cc4ec1bb3b31eab8cfbb2d3557822b4a87f1dd1fbfbe67a4ae11d






----

### Notes (1559 testing): 

* Setup: 

    * 3 mev-geth nodes (`jason/v1.11-mev` branch) and 1 bootnode (to allow peering) on a shared docker network

    * The 3 nodes are mining, with 8 threads, and propagate txs/blocks upon mining as expected (though DAG generation can take a long time)

    * `--override.london=0` to force the london hardfork from genesis block

        * Confimed by making sure `baseFeePerGas` is exposed in the block header

        ![console](./images/baseFeePerGas.png)

    * All  nodes have their RPCs (port :8545) enabled + binded to :1111, :1112, :1113, :1114 ports on the host machine (to send txs to them)

    * Also a network dashboard to help debug (making sure blocks are mined, peers are alive), can be visited by opening the random port (assigned by docker after running) in the browser

      ![dashboard](./images/dashboard.png)


* Running 

    * First, build the required docker images

        * `./build.sh`

    * Next, deploy + start the containers

        * `./run deploy`
    
    * To stop/start after: 
        * `./run stop` and `./run start`

    * send sample tx (to a random peer RPC): 
        * `npm run sendTx`


```
run deploy
run start
run stop
run login nodename
run geth nodename
run log nodeName

```

^nodeName = ethbn/eth1/eth2/eth3

Next steps: 

* Migrating to ethers, relevant https://github.com/ethers-io/ethers.js/issues/1685

* Adjust gaslimit in the genesis.json file to test for the following conditions: 

   * `Each block’s baseFeePerGas can increase/decrease by up to 12.5% depending on how full the block is relative to the previous one: e.g. 100% full -> +12.5%, 50% full -> same, 0% full -> -12.5%.`
 
   * Making sure bundles don't break this^
 
* Migrating old bundle flow rate script here to stress test the basefee + how tip must be adjusted to get included
