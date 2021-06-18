bootnode --nodekey /home/user/bootnode.key 2>> /home/user/node.log &
sleep 2
nodejs /home/user/config/tools/broadcast 9090 enode://$(bootnode -writeaddress --nodekey=/home/user/bootnode.key)@$1:0?discport=30301 &
