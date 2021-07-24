const express = require('express')
const app = express()
const { Connection } = require('./src/mongo-connection');
const nTagger = require('./src/n-tagger');
const bodyParser = require('body-parser')

const port = 3000;

Connection.connectToMongo()

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Methods", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});  
app.use(bodyParser.json())

app.get('/', (req, res) => res.send('\nTagger server is online.'));

app.get('/testdb', async (req, res) => {
    let ret1 = await Connection.entitiesColl.find({}).toArray();
    let ret2 = await Connection.n_w2vColl.find({}).toArray();
    res.send({'1': ret1, '2': ret2});
})

app.get('/n-tagger', nTagger.getNext);
app.put('/n-tagger/:ref', nTagger.updateRef);

app.listen(port, () => console.log(`Tagger Server has started.\nListening at http://localhost:${port}`));
 