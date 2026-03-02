import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

// Setup Firebase Admin
if (getApps().length === 0) {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
    try {
        initializeApp({
            credential: cert(serviceAccountPath)
        });
        console.log("Firebase Admin Initialized for Migration.");
    } catch (err) {
        console.error("Failed to initialize Firebase Admin:", err);
        process.exit(1);
    }
}

const db = getFirestore();

async function runMigration() {
    let count = 0;
    try {
        console.log("Starting Migration: Clearing isPro for users without Paddle IDs...");

        // Find all users who are isPro = true
        const usersSnapshot = await db.collection('users').where('isPro', '==', true).get();

        console.log(`Found ${usersSnapshot.size} total Pro users.`);

        for (const doc of usersSnapshot.docs) {
            const data = doc.data();

            const hasPaddleSub = !!data.paddleSubscriptionId;
            const hasPaddleCust = !!data.paddleCustomerId;

            if (!hasPaddleSub && !hasPaddleCust) {
                // Determine if this user exists in Paddle by calling Paddle API? 
                // Or simply enforce a fresh start for production: "If you don't have Paddle info, you are not Pro."
                console.log(`User ${data.email || doc.id} is Pro but has NO Paddle info. Downgrading to Free.`);

                await doc.ref.update({
                    isPro: false
                });

                count++;
            } else {
                console.log(`User ${data.email || doc.id} has Paddle info. Keeping Pro.`);
            }
        }

        console.log(`\nMigration complete. Downgraded ${count} users missing real Paddle data.`);
        process.exit(0);
    } catch (err) {
        console.error("Migration Error:", err);
        process.exit(1);
    }
}

runMigration();
