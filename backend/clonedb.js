import { MongoClient } from 'mongodb';
import { ObjectId } from 'mongodb';


const config = {
  sourceUri: 'mongodb://10.99.1.1:27017',
  sourceDb: 'splitify',
  destinationUri: 'mongodb://localhost:27017',
  destinationDb: 'splitify',
  
  collections: [],
  
  excludeFields: {},
  
  transformations: {
    users: (doc) => {
      
      if (doc.email) doc.email = `user_${doc._id}@example.com`;
      if (doc.name) doc.name = `User ${doc._id.toString().substring(0, 5)}`;
      return doc;
    },
    orders: (doc) => {
      
      if (doc.status) doc.status = doc.status.toLowerCase();
      return doc;
    }
  },
  
  batchSize: 1000,
  dropDestination: true,
  preserveIndexes: true
};

async function cloneDatabase() {
  const sourceClient = new MongoClient(config.sourceUri);
  const destClient = new MongoClient(config.destinationUri);

  try {
    await sourceClient.connect();
    await destClient.connect();
    
    console.log(`Connected to source and destination MongoDB servers`);
    
    const sourceDb = sourceClient.db(config.sourceDb);
    const destDb = destClient.db(config.destinationDb);
    
    
    let collectionsToClone = config.collections;
    if (!collectionsToClone.length) {
      collectionsToClone = await sourceDb.listCollections().toArray();
      collectionsToClone = collectionsToClone.map(c => c.name);
    }
    
    console.log(`Collections to clone: ${collectionsToClone.join(', ')}`);

    
    for (const collName of collectionsToClone) {
      console.log(`Processing collection: ${collName}`);
      
      
      const sourceCollection = sourceDb.collection(collName);
      const destCollection = destDb.collection(collName);
      
      
      if (config.dropDestination) {
        try {
          await destCollection.drop();
          console.log(`Dropped destination collection: ${collName}`);
        } catch (err) {
          
          console.log(`Collection ${collName} doesn't exist in destination or couldn't be dropped`);
        }
      }

      
      let indexes = [];
      if (config.preserveIndexes) {
        indexes = await sourceCollection.indexes();
        
        indexes = indexes.filter(index => index.name !== '_id_');
      }

      
      const excludeFieldsList = [
        ...(config.excludeFields._default || []),
        ...(config.excludeFields[collName] || [])
      ];
      
      const projection = {};
      excludeFieldsList.forEach(field => {
        projection[field] = 0;
      });

      
      const cursor = sourceCollection.find({}, { projection });
      let batch = [];
      let totalDocuments = 0;
      let processedDocuments = 0;
      
      
      totalDocuments = await sourceCollection.countDocuments();
      console.log(`Total documents to process: ${totalDocuments}`);

      for await (const doc of cursor) {
        
        let transformedDoc = doc;
        if (config.transformations[collName]) {
          transformedDoc = config.transformations[collName](doc);
        }
        
        batch.push(transformedDoc);
        
        
        if (batch.length >= config.batchSize) {
          await destCollection.insertMany(batch);
          processedDocuments += batch.length;
          console.log(`Processed ${processedDocuments}/${totalDocuments} documents in ${collName}`);
          batch = [];
        }
      }
      
      
      if (batch.length > 0) {
        await destCollection.insertMany(batch);
        processedDocuments += batch.length;
        console.log(`Processed ${processedDocuments}/${totalDocuments} documents in ${collName}`);
      }
      
      
      if (config.preserveIndexes && indexes.length > 0) {
        for (const indexDef of indexes) {
          
          const { name, key, ...options } = indexDef;
          await destCollection.createIndex(key, { ...options, name });
        }
        console.log(`Created ${indexes.length} indexes for collection ${collName}`);
      }
      
      console.log(`Completed cloning of collection: ${collName}`);
    }
    
    console.log(`Database clone and clean operation completed successfully`);
    
  } catch (err) {
    console.error('Error during database clone:', err);
  } finally {
    await sourceClient.close();
    await destClient.close();
    console.log('Database connections closed');
  }
}

cloneDatabase().catch(console.error);




