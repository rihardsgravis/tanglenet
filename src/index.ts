import Server from "./server"
import Tangle from "./tangle"

const port = process.env.IOTA_PORT || 3000

Server.use(Tangle.route.bind(Tangle))

Server.listen(port, (err) => {

   if (err) {
      return console.log(err)
   }

   return console.log(`Server running on port ${port}`)

})