LOG="/home/user/node.log"

#
# Stop node
#
if [[ $1 = "stop" ]]; then
  echo "Stoping eth node in $HOSTNAME..."
  kill -9 `pgrep nodejs`
  kill -HUP `pgrep geth`
fi

#
# Start the node
#
if [[ $1 = "start" ]]; then
  echo "Starting eth node in $HOSTNAME..." >> $LOG
  bootnode=`curl ethbn:9090`
  echo "Bootnode: $bootnode" >> $LOG
  # --override.london 0 => forces london hardfork (1559) at block 0
  geth -datadir /home/user/data -bootnodes $bootnode --nousb --networkid 500 --override.london 0 --mine --miner.threads=1 --miner.recommit=1s --miner.etherbase=0xfb05314AD5f12968Fa71C0c944aA376C5f3316D5 --miner.maxmergedbundles=3 --miner.trustedrelays=0xfb11e78C4DaFec86237c2862441817701fdf197F,0xfb4DF6C0b652E483fF4ee922654222507A0A7df6 --rpc --rpccorsdomain "*" --rpcapi "eth,web3,personal,net" --rpcaddr "0.0.0.0" --allow-insecure-unlock 2>> $LOG &
  sleep 2
  localAccount=`geth --exec "eth.coinbase" -verbosity 0 -datadir data/ attach`
  nodejs /home/user/config/tools/broadcast.js 9091 $localAccount &
  echo "Starting monitor..." >> $LOG
  cd /home/user/monitor
  ./node_modules/pm2/bin/pm2 start app.json &
fi

if [[ $1 = "init" ]]; then
  sed -i 's/##_##/'$HOSTNAME'/g' /home/user/monitor/app.json
  echo "Init eth node in $HOSTNAME..." >> $LOG
  geth -datadir /home/user/data init config/genesis.json 2>> $LOG
  echo "Creating account in $HOSTNAME..." >> $LOG
  geth -datadir /home/user/data --password config/pwd account new >> $LOG
fi

