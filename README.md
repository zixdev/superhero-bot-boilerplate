# Superhero Bot Boilerplate

## Table of contents

- [Introduction](#Introduction)
- [Prerequisites](#Prerequisites)
- [Getting started](#Getting-started)
- [How to](#How-to)
- [End-to-end encryption](#End-to-end-encryption)

## Introduction
This is a boilerplate project to create a new Superhero bot using [matrix-bot-sdk](https://github.com/turt2live/matrix-bot-sdk). It already implements a sample bot, `ae_wallet`, which enables Superhero Wallet connection, balance check and transfer. 

## Prerequisites
First install and run your own Matrix homeserver, the suggested one is [Synapse](https://github.com/element-hq/synapse). 
There are [different ways](https://element-hq.github.io/synapse/latest/setup/installation.html) to start your own Synapse server and one is explained in the following Docker hub: https://hub.docker.com/r/matrixdotorg/synapse

Install and run [Element UI](https://github.com/element-hq/element-web), the suggested Matrix client. The following guide explains how to install it: https://github.com/element-hq/element-web/blob/develop/docs/install.md. 

Create a bot account on Matrix and get an access token using the following guide: https://t2bot.io/docs/access_tokens.
If you used the `matrixdotorg/synapse` Docker image you can simply run the command `register_new_matrix_user` to create a new user:


## Getting started
First, download and install [Node.js](https://nodejs.org/en/download).

Clone superhero-bot-boilerplate repository.
```
git clone https://github.com/superhero-com/superhero-bot-boilerplate
```
Install the required dependencies with npm.
```
npm i
```
Run the project in development mode with hot reload.
```
npm run dev
```
Setup environment variables by creating a new .env file (see `.env.example` file).

## How to
New bots can be added by exending the base class `BaseBot` present in the `bots/@base` folder which offers a standardized way to implement commands.

The bot needs to be connected to a user to properly work, check `index.ts` for a complete sample of ae_wallet bot. 

## End-to-end encryption

Bot supports End-to-end encrypted messages. Be sure to back up `BOT_STORAGE_FILE` and `BOT_ENCRYPTION_DIR` to not lose encryption data.
