/**
 * Database Schema & Connection Management
 * Supports millions of leads with optimized indexing
 */

import * as sqlite3 from 'sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = path.join(process.cwd(), 'spectral.db');

export interface LeadRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  company: string;
  location: string;
  verified: boolean;
  score: number;
  grade: string;
  enrichment_level: string;
  created_at: string;
  updated_at: string;
}

export interface OperationRecord {
  id: string;
  type: 'verify' | 'score' | 'sync_crm' | 'import';
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_count: number;
  processed_count: number;
  success_count: number;
  error_count: number;
  progress_percent: number;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

let db: sqlite3.Database | null = null;

export function initDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, async (err) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        await createTables();
        console.log(`✓ Database initialized: ${DB_PATH}`);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function createTables(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not initialized'));

    db.serialize(() => {
      // Leads table
      db!.run(
        `CREATE TABLE IF NOT EXISTS leads (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          phone TEXT,
          title TEXT,
          company TEXT,
          location TEXT,
          verified BOOLEAN DEFAULT 0,
          score INTEGER DEFAULT 0,
          grade TEXT,
          enrichment_level TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
          if (err) reject(err);
        }
      );

      // Indexes for common queries
      db!.run(
        `CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email)`,
        (err) => {
          if (err) reject(err);
        }
      );
      db!.run(
        `CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company)`,
        (err) => {
          if (err) reject(err);
        }
      );
      db!.run(
        `CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score)`,
        (err) => {
          if (err) reject(err);
        }
      );
      db!.run(
        `CREATE INDEX IF NOT EXISTS idx_leads_verified ON leads(verified)`,
        (err) => {
          if (err) reject(err);
        }
      );

      // Operations table
      db!.run(
        `CREATE TABLE IF NOT EXISTS operations (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          total_count INTEGER DEFAULT 0,
          processed_count INTEGER DEFAULT 0,
          success_count INTEGER DEFAULT 0,
          error_count INTEGER DEFAULT 0,
          progress_percent REAL DEFAULT 0,
          started_at TEXT DEFAULT CURRENT_TIMESTAMP,
          completed_at TEXT,
          error_message TEXT
        )`,
        (err) => {
          if (err) reject(err);
        }
      );

      db!.run(
        `CREATE INDEX IF NOT EXISTS idx_operations_status ON operations(status)`,
        (err) => {
          if (err) reject(err);
        }
      );

      // Statistics cache table
      db!.run(
        `CREATE TABLE IF NOT EXISTS statistics (
          id INTEGER PRIMARY KEY,
          total_leads INTEGER DEFAULT 0,
          verified_leads INTEGER DEFAULT 0,
          avg_score REAL DEFAULT 0,
          top_companies TEXT,
          last_updated TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
        () => resolve()
      );
    });
  });
}

export function getDatabase(): sqlite3.Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export async function insertLead(lead: Omit<LeadRecord, 'created_at' | 'updated_at'>): Promise<void> {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.run(
      `INSERT OR REPLACE INTO leads (id, name, email, phone, title, company, location, verified, score, grade, enrichment_level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [lead.id, lead.name, lead.email, lead.phone, lead.title, lead.company, lead.location, lead.verified ? 1 : 0, lead.score, lead.grade, lead.enrichment_level],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export async function insertLeadsBatch(leads: Array<Omit<LeadRecord, 'created_at' | 'updated_at'>>): Promise<void> {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      let completed = 0;

      leads.forEach((lead) => {
        db.run(
          `INSERT OR REPLACE INTO leads (id, name, email, phone, title, company, location, verified, score, grade, enrichment_level)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [lead.id, lead.name, lead.email, lead.phone, lead.title, lead.company, lead.location, lead.verified ? 1 : 0, lead.score, lead.grade, lead.enrichment_level],
          (err) => {
            if (err) {
              db.run('ROLLBACK');
              reject(err);
              return;
            }
            completed++;
            if (completed === leads.length) {
              db.run('COMMIT', (err) => {
                if (err) reject(err);
                else resolve();
              });
            }
          }
        );
      });
    });
  });
}

export async function getLeads(limit: number = 100, offset: number = 0): Promise<LeadRecord[]> {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.all(
      `SELECT * FROM leads ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

export async function getLeadsCount(): Promise<number> {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.get(`SELECT COUNT(*) as count FROM leads`, (err, row: any) => {
      if (err) reject(err);
      else resolve(row?.count || 0);
    });
  });
}

export async function getStatistics(): Promise<any> {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.get(
      `SELECT 
        COUNT(*) as total_leads,
        SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as verified_leads,
        AVG(score) as avg_score,
        COUNT(DISTINCT company) as unique_companies
       FROM leads`,
      (err, row) => {
        if (err) reject(err);
        else resolve(row || {});
      }
    );
  });
}

export async function getLeadsByCompany(company: string, limit: number = 50): Promise<LeadRecord[]> {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.all(
      `SELECT * FROM leads WHERE company = ? ORDER BY score DESC LIMIT ?`,
      [company, limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

export async function updateOperationProgress(operationId: string, processed: number, success: number, error: number, total: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const percent = (processed / total) * 100;
    db.run(
      `UPDATE operations SET processed_count = ?, success_count = ?, error_count = ?, progress_percent = ? WHERE id = ?`,
      [processed, success, error, percent, operationId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export async function createOperation(type: string, totalCount: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const opId = `${type}-${Date.now()}`;
    db.run(
      `INSERT INTO operations (id, type, total_count) VALUES (?, ?, ?)`,
      [opId, type, totalCount],
      (err) => {
        if (err) reject(err);
        else resolve(opId);
      }
    );
  });
}

export async function getOperation(operationId: string): Promise<OperationRecord | null> {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.get(`SELECT * FROM operations WHERE id = ?`, [operationId], (err, row) => {
      if (err) reject(err);
      else resolve(row as OperationRecord || null);
    });
  });
}
