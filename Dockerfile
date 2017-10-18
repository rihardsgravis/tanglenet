FROM mhart/alpine-node:latest

RUN apk add --update git

RUN npm install -g pm2
RUN npm install -g typescript

ADD . /tanglenet

WORKDIR /tanglenet

RUN npm install
RUN npm run build