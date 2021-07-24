const MongoClient = require('mongodb').MongoClient;

class Connection {
    static async connectToMongo() {
        if (this.db) return this.db;
        this.client = await MongoClient.connect(this.url, this.options);
        this.db = await this.client.db(this.dbName);

        this.entitiesColl = await this.db.collection('entities');
        this.n_w2vColl = await this.db.collection('n_w2v');

        return this.db;
    }
} 

Connection.client = null;
Connection.db = null;

Connection.entitiesColl = null;
Connection.n_w2vColl = null;

Connection.url = 'mongodb://localhost:27017';
Connection.dbName = 'norm';
Connection.options = {
    bufferMaxEntries:   0,
    useNewUrlParser: true,
    useUnifiedTopology: true
};

module.exports = { Connection };