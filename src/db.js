import { openDB } from 'idb';

const DB_NAME = 'cab-tracker-db';
const STORE_NAME = 'locations';

// Initialize the database and create our schema
export const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      // Create a store called 'locations' where 'timestamp' is the unique ID
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'timestamp' });
      }
    },
  });
};

// Add a new GPS coordinate to the database
export const addLocation = async (lat, lng, status = 'Moving') => {
  const db = await initDB();
  const locationData = {
    timestamp: Date.now(), // This is our unique key
    lat,
    lng,
    status
  };
  await db.add(STORE_NAME, locationData);
  return locationData;
};

// Fetch all recorded coordinates (We will use this on Day 6 for the History Log)
export const getAllLocations = async () => {
  const db = await initDB();
  return db.getAll(STORE_NAME);
};