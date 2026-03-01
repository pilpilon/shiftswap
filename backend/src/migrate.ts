/**
 * One-time migration script: moves root-level collections to multi-tenant subcollections
 * under businesses/{businessId}/.
 *
 * Collections migrated:
 *   staff                         → businesses/{bid}/staff
 *   availability/{bid}/{week}/{phone}  → businesses/{bid}/availability/{week}/submissions/{phone}
 *   published_schedules/{bid}/weeks/{week} → businesses/{bid}/published_schedules/{week}
 *   negotiation_logs (with businessId field) → businesses/{bid}/negotiation_logs
 *
 * Usage:
 *   cd backend
 *   npx ts-node src/migrate.ts
 *
 * NOTE: Set GOOGLE_APPLICATION_CREDENTIALS=./service-account.json (or your path) before running.
 */

import * as admin from 'firebase-admin';

// ── Config ──────────────────────────────────────────────────────────────────
const BUSINESS_ID = 'k7NIHrSs1Uf6lpbfZK6DqPAk6422';

// ── Init ────────────────────────────────────────────────────────────────────
import * as fs from 'fs';
import * as path from 'path';

const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

async function migrateStaff() {
    console.log('\n── Migrating staff ──');
    const oldSnap = await db.collection('staff').where('businessId', '==', BUSINESS_ID).get();
    console.log(`  Found ${oldSnap.size} staff docs`);

    const batch = db.batch();
    for (const doc of oldSnap.docs) {
        const data = doc.data();
        delete data.businessId; // no longer needed — implied by path
        const newRef = db.collection('businesses').doc(BUSINESS_ID).collection('staff').doc(doc.id);
        batch.set(newRef, data);
        console.log(`  → ${data.name || doc.id}`);
    }
    await batch.commit();
    console.log(`  ✅ Migrated ${oldSnap.size} staff docs`);
}

async function migrateAvailability() {
    console.log('\n── Migrating availability ──');
    // Old path: availability/{businessId}/{weekKey}/{phone}
    // New path: businesses/{businessId}/availability/{weekKey}/submissions/{phone}
    const bizDoc = db.collection('availability').doc(BUSINESS_ID);
    const weekCollections = await bizDoc.listCollections();

    let total = 0;
    for (const weekCol of weekCollections) {
        const weekKey = weekCol.id;
        const phoneDocs = await weekCol.get();
        console.log(`  Week ${weekKey}: ${phoneDocs.size} submissions`);

        const batch = db.batch();
        for (const doc of phoneDocs.docs) {
            const newRef = db.collection('businesses').doc(BUSINESS_ID)
                .collection('availability').doc(weekKey)
                .collection('submissions').doc(doc.id);
            batch.set(newRef, doc.data());
            total++;
        }
        await batch.commit();
    }
    console.log(`  ✅ Migrated ${total} availability docs`);
}

async function migratePublishedSchedules() {
    console.log('\n── Migrating published_schedules ──');
    // Old path: published_schedules/{businessId}/weeks/{weekKey}
    // New path: businesses/{businessId}/published_schedules/{weekKey}
    const weeksSnap = await db.collection('published_schedules').doc(BUSINESS_ID)
        .collection('weeks').get();
    console.log(`  Found ${weeksSnap.size} week schedule docs`);

    const batch = db.batch();
    for (const doc of weeksSnap.docs) {
        const newRef = db.collection('businesses').doc(BUSINESS_ID)
            .collection('published_schedules').doc(doc.id);
        batch.set(newRef, doc.data());
        console.log(`  → ${doc.id}`);
    }
    await batch.commit();
    console.log(`  ✅ Migrated ${weeksSnap.size} schedule docs`);
}

async function migrateNegotiationLogs() {
    console.log('\n── Migrating negotiation_logs ──');
    // Old path: negotiation_logs (root, with businessId field)
    // New path: businesses/{businessId}/negotiation_logs
    const oldSnap = await db.collection('negotiation_logs')
        .where('businessId', '==', BUSINESS_ID).get();
    console.log(`  Found ${oldSnap.size} log docs`);

    // Firestore batch limit = 500
    const chunks = [];
    for (let i = 0; i < oldSnap.docs.length; i += 400) {
        chunks.push(oldSnap.docs.slice(i, i + 400));
    }

    let total = 0;
    for (const chunk of chunks) {
        const batch = db.batch();
        for (const doc of chunk) {
            const data = doc.data();
            delete data.businessId;
            // Add TTL expiresAt (20 days from now) for newly migrated logs
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 20);
            data.expiresAt = expiresAt.toISOString();

            const newRef = db.collection('businesses').doc(BUSINESS_ID)
                .collection('negotiation_logs').doc(doc.id);
            batch.set(newRef, data);
            total++;
        }
        await batch.commit();
    }
    console.log(`  ✅ Migrated ${total} log docs`);
}

async function main() {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║  ShiftSwap Multi-Tenant Data Migration   ║');
    console.log(`║  Business: ${BUSINESS_ID}  ║`);
    console.log('╚══════════════════════════════════════════╝');

    try {
        await migrateStaff();
        await migrateAvailability();
        await migratePublishedSchedules();
        await migrateNegotiationLogs();

        console.log('\n🎉 Migration complete!');
        console.log('⚠️  After verifying data, you can manually delete the old root collections.');
    } catch (err) {
        console.error('\n❌ Migration failed:', err);
    }
    process.exit(0);
}

main();
