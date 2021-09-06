docker build . -t mev-geth-megabundle-image  # no cache to ensure we get latest branch of mev-geth repo
docker build netstat -t netstat-img