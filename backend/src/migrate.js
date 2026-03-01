"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var admin = __importStar(require("firebase-admin"));
// ── Config ──────────────────────────────────────────────────────────────────
var BUSINESS_ID = 'k7NIHrSs1Uf6lpbfZK6DqPAk6422';
// ── Init ────────────────────────────────────────────────────────────────────
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'shiftswap-3a3d3'
});
var db = admin.firestore();
function migrateStaff() {
    return __awaiter(this, void 0, void 0, function () {
        var oldSnap, batch, _i, _a, doc, data, newRef;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('\n── Migrating staff ──');
                    return [4 /*yield*/, db.collection('staff').where('businessId', '==', BUSINESS_ID).get()];
                case 1:
                    oldSnap = _b.sent();
                    console.log("  Found ".concat(oldSnap.size, " staff docs"));
                    batch = db.batch();
                    for (_i = 0, _a = oldSnap.docs; _i < _a.length; _i++) {
                        doc = _a[_i];
                        data = doc.data();
                        delete data.businessId; // no longer needed — implied by path
                        newRef = db.collection('businesses').doc(BUSINESS_ID).collection('staff').doc(doc.id);
                        batch.set(newRef, data);
                        console.log("  \u2192 ".concat(data.name || doc.id));
                    }
                    return [4 /*yield*/, batch.commit()];
                case 2:
                    _b.sent();
                    console.log("  \u2705 Migrated ".concat(oldSnap.size, " staff docs"));
                    return [2 /*return*/];
            }
        });
    });
}
function migrateAvailability() {
    return __awaiter(this, void 0, void 0, function () {
        var bizDoc, weekCollections, total, _i, weekCollections_1, weekCol, weekKey, phoneDocs, batch, _a, _b, doc, newRef;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log('\n── Migrating availability ──');
                    bizDoc = db.collection('availability').doc(BUSINESS_ID);
                    return [4 /*yield*/, bizDoc.listCollections()];
                case 1:
                    weekCollections = _c.sent();
                    total = 0;
                    _i = 0, weekCollections_1 = weekCollections;
                    _c.label = 2;
                case 2:
                    if (!(_i < weekCollections_1.length)) return [3 /*break*/, 6];
                    weekCol = weekCollections_1[_i];
                    weekKey = weekCol.id;
                    return [4 /*yield*/, weekCol.get()];
                case 3:
                    phoneDocs = _c.sent();
                    console.log("  Week ".concat(weekKey, ": ").concat(phoneDocs.size, " submissions"));
                    batch = db.batch();
                    for (_a = 0, _b = phoneDocs.docs; _a < _b.length; _a++) {
                        doc = _b[_a];
                        newRef = db.collection('businesses').doc(BUSINESS_ID)
                            .collection('availability').doc(weekKey)
                            .collection('submissions').doc(doc.id);
                        batch.set(newRef, doc.data());
                        total++;
                    }
                    return [4 /*yield*/, batch.commit()];
                case 4:
                    _c.sent();
                    _c.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 2];
                case 6:
                    console.log("  \u2705 Migrated ".concat(total, " availability docs"));
                    return [2 /*return*/];
            }
        });
    });
}
function migratePublishedSchedules() {
    return __awaiter(this, void 0, void 0, function () {
        var weeksSnap, batch, _i, _a, doc, newRef;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('\n── Migrating published_schedules ──');
                    return [4 /*yield*/, db.collection('published_schedules').doc(BUSINESS_ID)
                            .collection('weeks').get()];
                case 1:
                    weeksSnap = _b.sent();
                    console.log("  Found ".concat(weeksSnap.size, " week schedule docs"));
                    batch = db.batch();
                    for (_i = 0, _a = weeksSnap.docs; _i < _a.length; _i++) {
                        doc = _a[_i];
                        newRef = db.collection('businesses').doc(BUSINESS_ID)
                            .collection('published_schedules').doc(doc.id);
                        batch.set(newRef, doc.data());
                        console.log("  \u2192 ".concat(doc.id));
                    }
                    return [4 /*yield*/, batch.commit()];
                case 2:
                    _b.sent();
                    console.log("  \u2705 Migrated ".concat(weeksSnap.size, " schedule docs"));
                    return [2 /*return*/];
            }
        });
    });
}
function migrateNegotiationLogs() {
    return __awaiter(this, void 0, void 0, function () {
        var oldSnap, chunks, i, total, _i, chunks_1, chunk, batch, _a, chunk_1, doc, data, expiresAt, newRef;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('\n── Migrating negotiation_logs ──');
                    return [4 /*yield*/, db.collection('negotiation_logs')
                            .where('businessId', '==', BUSINESS_ID).get()];
                case 1:
                    oldSnap = _b.sent();
                    console.log("  Found ".concat(oldSnap.size, " log docs"));
                    chunks = [];
                    for (i = 0; i < oldSnap.docs.length; i += 400) {
                        chunks.push(oldSnap.docs.slice(i, i + 400));
                    }
                    total = 0;
                    _i = 0, chunks_1 = chunks;
                    _b.label = 2;
                case 2:
                    if (!(_i < chunks_1.length)) return [3 /*break*/, 5];
                    chunk = chunks_1[_i];
                    batch = db.batch();
                    for (_a = 0, chunk_1 = chunk; _a < chunk_1.length; _a++) {
                        doc = chunk_1[_a];
                        data = doc.data();
                        delete data.businessId;
                        expiresAt = new Date();
                        expiresAt.setDate(expiresAt.getDate() + 20);
                        data.expiresAt = expiresAt.toISOString();
                        newRef = db.collection('businesses').doc(BUSINESS_ID)
                            .collection('negotiation_logs').doc(doc.id);
                        batch.set(newRef, data);
                        total++;
                    }
                    return [4 /*yield*/, batch.commit()];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    console.log("  \u2705 Migrated ".concat(total, " log docs"));
                    return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('╔══════════════════════════════════════════╗');
                    console.log('║  ShiftSwap Multi-Tenant Data Migration   ║');
                    console.log("\u2551  Business: ".concat(BUSINESS_ID, "  \u2551"));
                    console.log('╚══════════════════════════════════════════╝');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    return [4 /*yield*/, migrateStaff()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, migrateAvailability()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, migratePublishedSchedules()];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, migrateNegotiationLogs()];
                case 5:
                    _a.sent();
                    console.log('\n🎉 Migration complete!');
                    console.log('⚠️  After verifying data, you can manually delete the old root collections.');
                    return [3 /*break*/, 7];
                case 6:
                    err_1 = _a.sent();
                    console.error('\n❌ Migration failed:', err_1);
                    return [3 /*break*/, 7];
                case 7:
                    process.exit(0);
                    return [2 /*return*/];
            }
        });
    });
}
main();
