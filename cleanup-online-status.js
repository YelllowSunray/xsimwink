/**
 * Cleanup Script: Mark all performers as offline
 * 
 * This script will:
 * 1. Find all performer documents in Firestore
 * 2. Set their isOnline status to false
 * 3. Update their availability.isAvailable to false
 * 
 * Run this once to fix the issue where all users appear online.
 * 
 * Usage:
 *   node cleanup-online-status.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // You'll need to download this from Firebase Console

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanupOnlineStatus() {
  try {
    console.log('🔍 Fetching all performers...');
    
    const performersSnapshot = await db.collection('performers').get();
    
    console.log(`📊 Found ${performersSnapshot.size} performers`);
    
    if (performersSnapshot.empty) {
      console.log('✅ No performers found to update');
      return;
    }
    
    const batch = db.batch();
    let updateCount = 0;
    
    performersSnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Only update if currently marked as online
      if (data.isOnline === true) {
        batch.update(doc.ref, {
          isOnline: false,
          'availability.isAvailable': false,
          lastSeen: admin.firestore.FieldValue.serverTimestamp()
        });
        updateCount++;
        console.log(`  - Marking ${data.displayName || doc.id} as offline`);
      }
    });
    
    if (updateCount > 0) {
      console.log(`\n🔄 Updating ${updateCount} performers...`);
      await batch.commit();
      console.log('✅ All performers marked as offline!');
    } else {
      console.log('✅ All performers already offline');
    }
    
    console.log('\n🎉 Cleanup complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Also provide a function to update user profiles
async function cleanupUserProfiles() {
  try {
    console.log('\n🔍 Checking user profiles...');
    
    const usersSnapshot = await db.collection('users').get();
    
    console.log(`📊 Found ${usersSnapshot.size} users`);
    
    if (usersSnapshot.empty) {
      console.log('✅ No users found');
      return;
    }
    
    const batch = db.batch();
    let updateCount = 0;
    
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Set isPerformer to false for users who don't have it explicitly set
      // This is optional - only run if you want to reset all users
      if (data.isPerformer === true) {
        console.log(`  - User ${data.displayName || doc.id} is marked as performer`);
        // Uncomment the line below to set all users to non-performers
        // batch.update(doc.ref, { isPerformer: false });
        // updateCount++;
      }
    });
    
    if (updateCount > 0) {
      console.log(`\n🔄 Would update ${updateCount} users (currently disabled for safety)`);
      // await batch.commit();
      console.log('💡 Uncomment the batch.update line if you want to reset all users to non-performers');
    }
    
  } catch (error) {
    console.error('❌ Error checking user profiles:', error);
  }
}

// Run the cleanup
console.log('🚀 Starting online status cleanup...\n');
cleanupOnlineStatus()
  .then(() => cleanupUserProfiles())
  .catch(console.error);



