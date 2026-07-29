require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'myuser',
  password: process.env.DB_PASSWORD || 'mypassword',
  database: process.env.DB_NAME || 'mydatabase'
});

db.connect(err => {
  if (err) {
    console.error('Connection error:', err);
    process.exit(1);
  }
  
  console.log('Connected to MySQL. Running migrations...');
  
  db.query('ALTER TABLE timesheets ADD COLUMN sheet_data LONGTEXT;', (err) => {
    if (err && err.code !== 'ER_DUP_FIELDNAME') console.error('Error adding sheet_data:', err.message);
    else console.log('Added sheet_data to timesheets (or it already exists).');
    
    db.query('ALTER TABLE timesheet_records ADD COLUMN raw_row TEXT;', (err) => {
      if (err && err.code !== 'ER_DUP_FIELDNAME') console.error('Error adding raw_row:', err.message);
      else console.log('Added raw_row to timesheet_records (or it already exists).');
      
      db.end();
      process.exit(0);
    });
  });
});
