import * as express from "express"

class Server {

   public express

   constructor() {
      this.express = express()
   }

}

export default new Server().express