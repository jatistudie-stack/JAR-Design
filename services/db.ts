import { neon } from '@neondatabase/serverless';
import { DesignRequest, User, UserRole } from '../types';

/**
 * PENTING: Gunakan hostname tanpa '-pooler' untuk driver HTTP (neon()).
 */
const CONNECTION_STRING = 'postgresql://neondb_owner:npg_rke7t1iQozOW@ep-crimson-bonus-a196herl.ap-southeast-1.aws.neon.tech/neondb';

// Inisialisasi fungsi SQL berbasis HTTP
const sql = neon(CONNECTION_STRING);

const execute = async (query: string, params: any[] = []) => {
  try {
    const result = await sql(query, params);
    return result;
  } catch (err: any) {
    console.error('Neon Database Fetch Error:', err.message);
    throw new Error(`Database Error: ${err.message}`);
  }
};

export const initDB = async (): Promise<void> => {
  try {
    // 1. Create Design Requests Table
    await execute(`
      CREATE TABLE IF NOT EXISTS design_requests (
        id TEXT PRIMARY KEY,
        outlet_name TEXT,
        design_type TEXT,
        dimensions TEXT,
        elements TEXT,
        reference_url TEXT,
        status TEXT,
        created_at TEXT,
        result_file_name TEXT,
        result_file_url TEXT,
        designer_name TEXT
      )
    `);

    // 2. Migration: Ensure designer_name exists (more robust check)
    const checkColumn = await execute(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='design_requests' AND column_name='designer_name'
    `);
    
    if (checkColumn.length === 0) {
      await execute('ALTER TABLE design_requests ADD COLUMN designer_name TEXT');
    }

    // 3. Create Users Table
    await execute(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT,
        role TEXT,
        name TEXT
      )
    `);

    // 4. Seed Admin
    const users = await execute('SELECT username FROM users WHERE username = $1', ['admin']);
    if (users.length === 0) {
      await execute(`
        INSERT INTO users (username, password, role, name) 
        VALUES ($1, $2, $3, $4)
      `, ['admin', '12345', 'Admin', 'Super Admin']);
    }
  } catch (e) {
    console.error('Init DB Failed:', e);
    throw e;
  }
};

export const loginUser = async (username: string, password: string): Promise<User | null> => {
  const rows = await execute(
    'SELECT username, role, name FROM users WHERE username = $1 AND password = $2', 
    [username, password]
  );
  if (rows && rows.length > 0) {
    const row = rows[0] as any;
    return {
      username: row.username,
      role: row.role as UserRole,
      name: row.name
    };
  }
  return null;
};

export const getAllRequests = async (): Promise<DesignRequest[]> => {
  const rows = await execute("SELECT * FROM design_requests ORDER BY created_at DESC");
  if (!rows) return [];
  return rows.map((row: any) => ({
    id: row.id,
    outletName: row.outlet_name,
    designType: row.design_type,
    dimensions: row.dimensions,
    elements: row.elements,
    referenceUrl: row.reference_url,
    status: row.status,
    createdAt: row.created_at,
    resultFileName: row.result_file_name,
    resultFileUrl: row.result_file_url,
    designerName: row.designer_name
  }));
};

export const insertRequest = async (req: DesignRequest) => {
  await execute(`
    INSERT INTO design_requests (
      id, outlet_name, design_type, dimensions, elements, reference_url, status, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [req.id, req.outletName, req.designType, req.dimensions, req.elements, req.referenceUrl, req.status, req.createdAt]);
};

export const updateRequest = async (req: DesignRequest) => {
  // We only update the content fields to avoid overwriting status or designer_name
  await execute(`
    UPDATE design_requests 
    SET outlet_name = $1, design_type = $2, dimensions = $3, elements = $4, reference_url = $5
    WHERE id = $6
  `, [req.outletName, req.designType, req.dimensions, req.elements, req.referenceUrl, req.id]);
};

export const deleteRequest = async (id: string) => {
  await execute('DELETE FROM design_requests WHERE id = $1', [id]);
};

export const assignDesignerToRequest = async (id: string, designerName: string) => {
  await execute(`
    UPDATE design_requests 
    SET status = 'In Progress', designer_name = $1
    WHERE id = $2
  `, [designerName, id]);
};

export const updateRequestResult = async (id: string, fileName: string, fileUrl: string) => {
  await execute(`
    UPDATE design_requests 
    SET status = 'Done', result_file_name = $1, result_file_url = $2
    WHERE id = $3
  `, [fileName, fileUrl, id]);
};

export const getAllUsers = async (): Promise<User[]> => {
  const rows = await execute('SELECT username, role, name FROM users ORDER BY name ASC');
  if (!rows) return [];
  return rows.map((row: any) => ({
    username: row.username,
    role: row.role as UserRole,
    name: row.name
  }));
};

export const addUser = async (user: User) => {
  await execute(
    'INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4)',
    [user.username, user.password, user.role, user.name]
  );
};

export const deleteUser = async (username: string) => {
  await execute('DELETE FROM users WHERE username = $1', [username]);
};

export const clearDB = async () => {
  await execute('DELETE FROM design_requests');
};