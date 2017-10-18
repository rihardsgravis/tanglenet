import redis = require("redis")
import express = require("express")
import IOTA = require("iota.lib.js")
import jwt = require("jsonwebtoken")
import mime = require('mime/lite')
import CronJob = require('cron')

class TangleClass {

   private iota: IotaClass
   private redis: redis.RedisClient
   private address: string
   private key: string
   private timestamp: number
   private job: CronJob.CronJob

   constructor() {

      this.iota = new IOTA({
         provider: process.env.IOTA_NODE || "http://localhost:14265"
      })

      this.redis = redis.createClient(6379, 'redis')

      this.redis.flushall()

      this.address = process.env.IOTA_ADDRESS
      this.key = process.env.IOTA_PUBKEY.replace(/\\n/g, "\n")

      this.timestamp = 0

      this.getContent()

      this.job = new CronJob.CronJob('0 */5 * * * *', () =>{
         this.getContent()
      })

      this.job.start()

   }

   async route(req: express.Request, res: express.Response, next: Function): Promise<void> {


      let path = (req.baseUrl + req.path).replace(/\/$/, "")
      if(!path.length) path = "/"

      // Helper route to serve address and public key
      if (path === "/data/info") {
         res.setHeader('Content-Type', 'application/json')
         res.write(JSON.stringify({
            address: this.address,
            key: this.key.split("-----")[2].replace(/(?:\r\n|\r|\n)/g, '')
         }))
         res.end()
         next()
         return
      }

      let entries = await this.getEntries(path)

      // If no match found, return root entry
      // TODO: Think of a better logic in this case
      if (!entries.length && path.indexOf("/asset/") < 0 && path.indexOf("/data/") < 0 ) {
         path = "/"
         entries = await this.getEntries(path)
      }

      if (!entries.length) {
         res.status(404)
         res.end()
         next()
         return
      }

      const dataType = entries[0].type

      switch (dataType) {

         case "html":
            res.setHeader('Content-Type', 'text/html')
            res.write(entries[entries.length - 1].content)
            break
         case "data":
            res.setHeader('Content-Type', 'application/json')
            res.write(JSON.stringify(entries.slice(-20).map(entry => entry.content)))
            break
         case "asset":

            const type = path.substr(path.lastIndexOf(".") + 1)

            res.setHeader('Content-Type', mime.getType(type))

            if(["png", "jpg", "gif"].indexOf(type) > -1){
               const buffer = new Buffer(entries[entries.length - 1].content, 'base64')
               res.setHeader('Content-Length', buffer.length)
               res.write(buffer)
            } else {
               res.write(entries[entries.length - 1].content)
            }

            break
      }

      res.end()
      next()

   }

   async getContent(): Promise<void> {

      let transactions = await this.getTransactions()

      // Filter new tx's
      transactions = transactions.filter(tx => tx.timestamp > this.timestamp)

      console.log(`Received new ${transactions.length} transactions`)

      // Sort transactions by bundle and/or bundle index
      transactions.sort((a, b) => (a.bundle === b.bundle) ? a.currentIndex - b.currentIndex : (a.bundle > b.bundle) ? 1 : -1)

      let currentMessage = ""

      for (const tx of transactions) {

         // Reset message on new bundle
         if (tx.currentIndex === 0) currentMessage = ""

         // Add current message fragment
         currentMessage += tx.signatureMessageFragment

         // Parse only last transactions in a bundle
         if (tx.lastIndex !== tx.currentIndex) continue

         // Remove trailing 9's
         const trytes = currentMessage.replace(/9+$/g, "")

         // Convert trytes to ASCII
         const message = this.iota.utils.fromTrytes(trytes)

         // Verify and put the data in cache
         try {

            let data = jwt.verify(message, this.key, { algorithms: ['RS256'] }) as any

            // All entries should have a "type", "route" and "content"
            if (!data.type || !data.route || !data.content) throw { message: "entry malformed" }

            // Create corresponding url route
            const route = (data.type === "html") ? data.route : `/${data.type}/${data.route}`

            // Setup entry for cache
            const entry = {
               type: data.type,
               content: data.content
            } as CacheEntry

            // Add the entry to cache
            this.redis.zadd(route, tx.timestamp, JSON.stringify(entry))

            // Update last valid timestamp
            if(tx.timestamp > this.timestamp) this.timestamp = tx.timestamp

         } catch (e) {

            console.log(`${tx.hash} - Entry error: ${e.message}`)

         }

      }

   }

   //TODO: Create an IXI module to get only new transactions based on the latest received timestamp
   getTransactions(): Promise<TransactionObject[]> {

      return new Promise((resolve, reject) => {
         this.iota.api.findTransactionObjects({ addresses: [this.address] }, (error, transactions) => {

            if (error) reject(error)
            resolve(transactions)

         })
      })

   }

   //TODO: Add timestamp funcionallity
   getEntries(route: string): Promise<CacheEntry[]> {

      return new Promise((resolve, reject) => {
         this.redis.zrangebyscore(route, "-inf", "+inf", (error, values) => {

            if (error) reject(error)

            const result = values.map(value => JSON.parse(value))

            resolve(result)

         })
      })

   }

}

const Tangle = new TangleClass()

export default Tangle