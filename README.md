# DEPRECATED: tanglenet
### IOTA's Tangle as a web platform
This is a basic __proof of concept__ to show how [IOTA's Tangle](https://github.com/iotaledger) can be used as a platform for decentralized, secure and free to distribute web applications.

### How
Each content chunk of the webapp (_`html`, `asset` or `data` in the current implementation_) is signed using [JSON Web Token library](https://auth0.com/blog/json-web-token-signing-algorithms-overview/) and attached to Tangle as feeless transaction with the content as a message. The whole webapp is residing on the Tangle and distributed by IOTA's nodes.
This Nodejs application collects all the corresponding transactions, verifies and serves them as a webpage.
To add new data to the datasaet or update an asset - a new transaction is issued, so (_not implemented here yet_) version control for the webapp/dataset is available out of the box.

### Setup
The easiest way tor un the server is by using [Docker](https://www.docker.com/community-edition). Create a `.env` file in the root directory of the app with the following content:
```
IOTA_PORT=3000
IOTA_NODE=https://localhost:14265
IOTA_ADDRESS=IOTAADDRESSOFTHEWEBAPPLICATION
IOTA_PUBKEY=-----BEGIN PUBLIC KEY-----\npublic\nkey\n-----END PUBLIC KEY-----\n
```
And then run it with:
```
docker-compose up
```

### Todo
- [x] Basic static demo - [https://iota.dance](https://iota.dance)
- [ ] Multiple data source/address functionallity
- [ ] Data upload example _(work in progress)_
- [ ] User input functionallity

