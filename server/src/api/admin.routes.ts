import { Router } from 'express';
import { getDb } from '../db/database';
import { 
  UsersRepository, 
  ClassesRepository, 
  SlidesRepository,
  SessionsRepository,
  StudentCopiesRepository,
  UploadsRepository,
  EventsRepository
} from '../db/repositories';

const router = Router();

// GET /api/admin/tables - List all tables
router.get('/tables', (req, res) => {
  try {
    const db = getDb();
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `).all();
    
    res.json({ tables });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/table/:name - View table data
router.get('/table/:name', (req, res) => {
  try {
    const { name } = req.params;
    const db = getDb();
    
    // Get table info
    const info = db.prepare(`PRAGMA table_info(${name})`).all();
    
    // Get data
    const data = db.prepare(`SELECT * FROM ${name}`).all();
    
    res.json({ 
      table: name,
      columns: info,
      rows: data,
      count: data.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/stats - Database statistics
router.get('/stats', (req, res) => {
  try {
    const db = getDb();
    
    const stats = {
      users: db.prepare('SELECT COUNT(*) as count FROM users').get(),
      classes: db.prepare('SELECT COUNT(*) as count FROM classes').get(),
      slides: db.prepare('SELECT COUNT(*) as count FROM slides').get(),
      sessions: db.prepare('SELECT COUNT(*) as count FROM sessions').get(),
      teachers: db.prepare("SELECT COUNT(*) as count FROM users WHERE role='teacher'").get(),
      students: db.prepare("SELECT COUNT(*) as count FROM users WHERE role='student'").get(),
    };
    
    res.json({ stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/test/users - Test UsersRepository
router.get('/test/users', (req, res) => {
  try {
    const users = UsersRepository.getAll();
    const teachers = UsersRepository.getTeachers();
    const students = UsersRepository.getStudents();
    
    res.json({ 
      total: users.length,
      teachers: teachers.length,
      students: students.length,
      users 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/test/classes - Test ClassesRepository
router.get('/test/classes', (req, res) => {
  try {
    const classes = ClassesRepository.getAll();
    const withDetails = classes.map(c => ClassesRepository.getWithSlidesCount(c.id));
    
    res.json({ 
      total: classes.length,
      classes: withDetails
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/test/slides/:classId - Test SlidesRepository
router.get('/test/slides/:classId', (req, res) => {
  try {
    const { classId } = req.params;
    const slides = SlidesRepository.getByClass(classId);
    
    res.json({ 
      class_id: classId,
      total: slides.length,
      slides
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
