# Docker config for each of the node that will exist in this private network
FROM ubuntu:20.04
USER root

# Create a non-root user (for later usage by this Dockerfile)
RUN useradd -m -s /bin/bash user

RUN apt-get update
RUN export DEBIAN_FRONTEND=noninteractive && apt-get install -y --no-install-recommends --fix-missing openssh-server vim build-essential git golang ca-certificates iputils-ping curl netcat nodejs npm

WORKDIR /home/user

# Setup node and packages, for the monitor
RUN npm install -g n && n lts
RUN npm install web3 express

# Bump golang up to 1.15 from default ubuntu version (for `make all` to work)
RUN apt-get purge -y golang*
RUN apt-get install wget
RUN wget https://golang.org/dl/go1.15.13.linux-amd64.tar.gz
RUN tar -C /usr/local -xzf go1.15.13.linux-amd64.tar.gz
RUN mkdir ~/.go
RUN GOROOT=/usr/local/go && GOPATH=~/.go && PATH=$PATH:$GOROOT/bin:$GOPATH/bin
RUN update-alternatives --install "/usr/bin/go" "go" "/usr/local/go/bin/go" 0
RUN update-alternatives --set go /usr/local/go/bin/go

# Switch to the non-root user
USER user

RUN mkdir data config
# We specify the specific branch with EIP1559 here, modify later accordingly
RUN git clone --single-branch --branch jason/v1.11-mev https://github.com/flashbots/mev-geth.git
# make all because we need additional tools to setup the bootnode 
RUN cd mev-geth && make geth && make all
COPY --chown=user config /home/user/config
USER root
RUN cp /home/user/mev-geth/build/bin/* /usr/local/bin
USER user

# For local testing, an interface that shows nodes on the network + blocks mined etc
WORKDIR /home/user
RUN git clone https://github.com/cubedro/eth-net-intelligence-api monitor
COPY ./netstat/app.json monitor
WORKDIR /home/user/monitor
RUN npm install pm2
RUN npm install

WORKDIR /home/user
EXPOSE 9090 9091 8545 8546 30301/udp 30303 30303/udp 30304